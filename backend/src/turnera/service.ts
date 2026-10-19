/**
 * Lógica de la turnera: catálogo de servicios, cálculo de disponibilidad y alta
 * de turnos.
 *
 * Esta es la parte que el frontend venía simulando en
 * frontend/cliente/src/turnera/data/availability.ts con slots generados por un
 * hash. Acá los horarios libres salen de verdad de la agenda del local, los
 * turnos ya tomados y los bloqueos.
 */
import type { PoolConnection } from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import { pool, enTransaccion } from "../core/database/conexion.js"
import { clientes } from "../modules/customers/customers.module.js"
import { catalogo } from "../modules/catalog/catalog.module.js"
import { comoTransaccion } from "../core/database/MySqlUnidadDeTrabajo.js"
import { conflicto, HttpError, malaPeticion } from "../core/errores.js"
import {
  aDateTime,
  aHora,
  aMinutos,
  hoy,
  minutosAhora,
  type FechaISO,
} from "../core/tiempo.js"
import type { NuevoTurno } from "./validacion.js"
import { linkDePago, montoSena, nuevoTokenSena, porcentajeSena, SENA_MINUTOS } from "./sena.js"
import { SQL_SENA_NO_VENCIDA } from "../modules/appointments/infrastructure/sqlOcupacion.js"
import { agenda } from "../modules/appointments/appointments.module.js"
import { MAX_TURNOS_PEDIDOS_WEB, problemaDeAnticipacion } from "../modules/appointments/domain/reglasReserva.js"

// ---------------------------------------------------------------- alta de turno

/** Si un turno que empieza ese día a esa hora ya empezó. */
export function yaEmpezo(fecha: FechaISO, inicio: number): boolean {
  return fecha < hoy() || (fecha === hoy() && inicio <= minutosAhora())
}

export type TurnoCreadoDTO = {
  id: number
  servicioId: number
  servicio: string
  clienteId: number
  fecha: FechaISO
  horaInicio: string
  horaFin: string
  precio: number
  estado: string
  /** Solo reservas de la web: para la URL de la confirmación (/reserva-confirmada?t=…). */
  token?: string
  /** Solo si se cobra seña: a dónde mandar a la clienta a pagar. */
  sena?: { monto: number; porcentaje: number; link: string; token: string; venceEnMinutos: number }
}

/**
 * Reserva un turno desde la web. La clienta no tiene cuenta: se la busca por
 * teléfono, o se la crea.
 */
export async function crearTurno(input: NuevoTurno): Promise<TurnoCreadoDTO> {
  const problema = problemaDeAnticipacion(input.fecha, aMinutos(input.hora), { fecha: hoy(), minutos: minutosAhora() }, await agenda.reglasDeReserva())
  if (problema) throw malaPeticion(problema)

  // Seña: solo si la dueña puso un porcentaje y Mercado Pago está conectado.
  const porcentaje = await porcentajeSena()
  const token = porcentaje > 0 ? nuevoTokenSena() : null

  const creado = await agendarTurno({
    sena: token ? { porcentaje, token } : undefined,
    tokenPublico: nuevoTokenSena(),
    servicioId: input.servicioId,
    fecha: input.fecha,
    hora: input.hora,
    notas: input.contacto.notas,
    estado: "reservado",
    respetarHorario: true,
    // La clienta la resuelve el módulo de clientas (customers): la misma
    // persona que reserva un turno y después compra en la tienda es UNA ficha.
    cliente: async (conn) => {
      const clienteId = await clientes.buscarOCrear(
        {
          ...clientes.separarNombreCompleto(input.contacto.nombreCompleto),
          telefono: input.contacto.telefono,
          email: input.contacto.email,
          cumple: input.contacto.cumple,
        },
        comoTransaccion(conn),
      )
      // Tope de turnos pedidos por clienta: que nadie llene la agenda desde la web.
      const [[pedidos]] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS n FROM turnos
          WHERE cliente_id = ? AND estado IN ('reservado', 'confirmado') AND fecha_hora_inicio > NOW() AND ${SQL_SENA_NO_VENCIDA}`,
        [clienteId],
      )
      if (Number(pedidos.n) >= MAX_TURNOS_PEDIDOS_WEB) {
        throw conflicto(`Ya tenés ${MAX_TURNOS_PEDIDOS_WEB} turnos reservados. Para reservar otro, escribinos por WhatsApp.`)
      }
      return clienteId
    },
  })
  if (!token) return creado

  // El link de pago se pide fuera de la transacción (es una llamada a Mercado
  // Pago). Si falla, el turno no puede quedar tomado sin forma de pagar.
  const monto = montoSena(creado.precio, porcentaje)
  try {
    const link = await linkDePago({ id: creado.id, servicio: creado.servicio, fecha: creado.fecha, hora: creado.horaInicio, monto, token })
    return { ...creado, sena: { monto, porcentaje, link, token, venceEnMinutos: SENA_MINUTOS } }
  } catch (err) {
    await pool.query("UPDATE turnos SET estado = 'cancelado', cancelado_por = 'sistema', cancelado_at = NOW(), sena_estado = 'vencida' WHERE id = ?", [creado.id])
    throw new HttpError(502, "No pudimos iniciar el pago de la seña con Mercado Pago. Probá de nuevo en un rato o escribinos por WhatsApp.", err instanceof HttpError ? err.message : undefined)
  }
}

export type AgendarTurno = {
  servicioId: number
  fecha: FechaISO
  hora: string
  notas?: string
  /**
   * "reservado" si lo pidió la clienta por la web; "confirmado" si lo cargó la
   * dueña; "completado" si la dueña registra uno que ya pasó (vino sin turno).
   */
  estado: "reservado" | "confirmado" | "completado"
  /**
   * La web solo deja reservar dentro del horario de atención. La dueña puede
   * dar un turno fuera de horario (un sábado a la tarde, un día cerrado), pero
   * nunca encima de otro turno o de un bloqueo.
   */
  respetarHorario: boolean
  /** Devuelve el id de la clienta. Corre dentro de la transacción. */
  cliente: (conn: PoolConnection) => Promise<number>
  /** Solo reservas de la web con seña: el turno nace esperando el pago (ver sena.ts). */
  sena?: { porcentaje: number; token: string }
  /** Solo reservas de la web: identifica la reserva en la URL de la confirmación. */
  tokenPublico?: string
}

/**
 * Agenda un turno. Lo usan la web (crearTurno) y el panel (admin/turnos.ts).
 *
 * Todo pasa dentro de una transacción, y la verificación de solapamiento se hace
 * con `FOR UPDATE` sobre los turnos del día. Sin eso, dos personas que reservan
 * el mismo horario al mismo tiempo pasan las dos la validación y el local queda
 * sobrevendido: la validación de disponibilidad del paso anterior no sirve como
 * garantía, porque entre que se consulta y se confirma pasa tiempo.
 */
export async function agendarTurno(input: AgendarTurno): Promise<TurnoCreadoDTO> {
  const servicio = await catalogo.servicioReservable(input.servicioId)
  const inicio = aMinutos(input.hora)
  const fin = inicio + servicio.duracionMin

  // Solo un turno ya completado puede estar en el pasado: es la dueña
  // registrando a alguien que vino sin turno. Todo lo demás, para adelante.
  const pasado = yaEmpezo(input.fecha, inicio)
  if (pasado && input.estado !== "completado") {
    throw malaPeticion("Ese horario ya pasó.")
  }
  if (!pasado && input.estado === "completado") {
    throw malaPeticion("Todavía no es la hora de ese turno: no se puede cargar como completado.")
  }
  if (fin > 24 * 60) {
    throw malaPeticion(`El turno de ${servicio.duracionMin} minutos terminaría pasada la medianoche.`)
  }

  if (input.respetarHorario) {
    await agenda.dentroDelHorario(input.fecha, inicio, fin, servicio.duracionMin)
  }

  return enTransaccion(async (conn) => {
    if (agenda.sePisa(await agenda.ocupado(input.fecha, comoTransaccion(conn)), inicio, fin)) {
      throw conflicto("Ese horario ya fue reservado. Elegí otro.")
    }

    const clienteId = await input.cliente(conn)

    const [result] = await conn.query(
      `INSERT INTO turnos
           (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, estado, precio, notas,
            sena_monto, sena_estado, sena_vence_at, sena_token, token_publico)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${input.sena ? `NOW() + INTERVAL ${SENA_MINUTOS} MINUTE` : "NULL"}, ?, ?)`,
      [
        clienteId,
        servicio.id,
        aDateTime(input.fecha, inicio),
        aDateTime(input.fecha, fin),
        input.estado,
        // Precio congelado: si mañana sube la lista, este turno conserva el que
        // la clienta vio al reservar.
        servicio.precio,
        input.notas ?? null,
        input.sena ? montoSena(servicio.precio, input.sena.porcentaje) : null,
        input.sena ? "pendiente" : null,
        input.sena?.token ?? null,
        input.tokenPublico ?? null,
      ],
    )
    const turnoId = (result as { insertId: number }).insertId

    return {
      id: turnoId,
      servicioId: servicio.id,
      servicio: servicio.nombre,
      clienteId,
      fecha: input.fecha,
      horaInicio: aHora(inicio),
      horaFin: aHora(fin),
      precio: servicio.precio,
      estado: input.estado,
      ...(input.tokenPublico ? { token: input.tokenPublico } : {}),
    }
  })
}
