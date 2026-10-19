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
import { leerConfigNumero } from "../shared/configuracion.js"
import { clientes } from "../modules/customers/customers.module.js"
import { catalogo } from "../modules/catalog/catalog.module.js"
import { comoTransaccion } from "../core/database/MySqlUnidadDeTrabajo.js"
import { conflicto, HttpError, malaPeticion } from "../core/errores.js"
import {
  aDateTime,
  aHora,
  aMinutos,
  diaSemanaISO,
  hoy,
  minutosAhora,
  seSolapan,
  type FechaISO,
} from "./tiempo.js"
import type { NuevoTurno } from "./validacion.js"
import { ESTADOS_OCUPAN } from "./estados.js"
import { linkDePago, montoSena, nuevoTokenSena, porcentajeSena, SENA_MINUTOS, SQL_SENA_NO_VENCIDA } from "./sena.js"
import { leerReglasReserva, MAX_TURNOS_PEDIDOS_WEB, problemaDeAnticipacion } from "./reglasReserva.js"

// ---------------------------------------------------------------- horarios

export type HorarioDTO = {
  /** 1 = lunes ... 7 = domingo (ISO 8601, NO la convención de JavaScript). */
  diaSemana: number
  desde: string
  hasta: string
}

/** La agenda semanal. Los días que no aparecen están cerrados. */
export async function listarHorarios(): Promise<HorarioDTO[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dia_semana, hora_inicio, hora_fin
       FROM horarios_atencion
      ORDER BY dia_semana, hora_inicio`,
  )
  return rows.map((r) => ({
    diaSemana: r.dia_semana,
    desde: String(r.hora_inicio).slice(0, 5),
    hasta: String(r.hora_fin).slice(0, 5),
  }))
}

// ---------------------------------------------------------------- disponibilidad

export type SlotDTO = { time: string; available: boolean }

type Ocupado = { desde: number; hasta: number }

/** Turnos ya tomados ese día, como rangos de minutos. */
export async function turnosDelDia(
  fecha: FechaISO,
  conn?: PoolConnection,
  bloquear = false,
  /** Al reprogramar un turno, su propio horario no cuenta como ocupado. */
  excluirTurnoId = 0,
): Promise<Ocupado[]> {
  const ejecutor = conn ?? pool
  const [rows] = await ejecutor.query<RowDataPacket[]>(
    `SELECT fecha_hora_inicio, fecha_hora_fin
       FROM turnos
      WHERE DATE(fecha_hora_inicio) = ?
        AND estado IN (?)
        AND ${SQL_SENA_NO_VENCIDA}
        AND id <> ?
      ORDER BY fecha_hora_inicio
      ${bloquear ? "FOR UPDATE" : ""}`,
    [fecha, ESTADOS_OCUPAN, excluirTurnoId],
  )
  return rows.map((r) => ({
    desde: aMinutos(String(r.fecha_hora_inicio).slice(11, 16)),
    hasta: aMinutos(String(r.fecha_hora_fin).slice(11, 16)),
  }))
}

/** Bloqueos (vacaciones, feriados, un rato puntual) que pisan ese día. */
export async function bloqueosDelDia(fecha: FechaISO, conn?: PoolConnection): Promise<Ocupado[]> {
  const ejecutor = conn ?? pool
  const [rows] = await ejecutor.query<RowDataPacket[]>(
    `SELECT fecha_hora_inicio, fecha_hora_fin
       FROM bloqueos
      WHERE fecha_hora_inicio < ? AND fecha_hora_fin > ?`,
    [`${fecha} 23:59:59`, `${fecha} 00:00:00`],
  )
  return rows.map((r) => {
    const inicio = String(r.fecha_hora_inicio)
    const fin = String(r.fecha_hora_fin)
    return {
      // Un bloqueo puede empezar antes o terminar después del día: se recorta.
      desde: inicio.slice(0, 10) < fecha ? 0 : aMinutos(inicio.slice(11, 16)),
      hasta: fin.slice(0, 10) > fecha ? 24 * 60 : aMinutos(fin.slice(11, 16)),
    }
  })
}

/**
 * Horarios en los que se puede reservar ese servicio ese día.
 *
 * Un slot está disponible si entra completo en el horario de atención, no se
 * solapa con ningún turno ni bloqueo, y todavía no pasó.
 */
export async function calcularDisponibilidad(
  servicioId: number,
  fecha: FechaISO,
  /** El panel, al reprogramar: el horario actual del turno se muestra libre. */
  excluirTurnoId = 0,
  /** La web aplica las reglas de anticipación (Turnos → Reglas); el panel no. */
  { reglasWeb = false } = {},
): Promise<SlotDTO[]> {
  // Al reprogramar, el servicio del turno puede estar pausado: igual hay que poder moverlo.
  const servicio = await catalogo.servicioReservable(servicioId, { incluirPausados: excluirTurnoId > 0 })

  const horarios = (await listarHorarios()).filter((h) => h.diaSemana === diaSemanaISO(fecha))
  if (horarios.length === 0) return [] // cerrado

  const paso = await leerConfigNumero("intervalo_turnos_min", 15)
  const ocupados = [...(await turnosDelDia(fecha, undefined, false, excluirTurnoId)), ...(await bloqueosDelDia(fecha))]

  const esHoy = fecha === hoy()
  const ahora = minutosAhora()
  const reglas = reglasWeb ? await leerReglasReserva() : null
  // Más allá del máximo de días, la web no ofrece nada ese día.
  if (reglas && problemaDeAnticipacion(fecha, 23 * 60 + 59, { fecha: hoy(), minutos: 0 }, { minHoras: 0, maxDias: reglas.maxDias })) {
    return []
  }

  const slots: SlotDTO[] = []
  for (const horario of horarios) {
    const apertura = aMinutos(horario.desde)
    const cierre = aMinutos(horario.hasta)

    // El turno tiene que terminar antes del cierre, no solo empezar antes.
    for (let inicio = apertura; inicio + servicio.duracionMin <= cierre; inicio += paso) {
      const fin = inicio + servicio.duracionMin
      const pisado = ocupados.some((o) => seSolapan(inicio, fin, o.desde, o.hasta))
      const yaPaso = esHoy && inicio <= ahora
      const muyPronto = reglas !== null && problemaDeAnticipacion(fecha, inicio, { fecha: hoy(), minutos: ahora }, reglas) !== null
      slots.push({ time: aHora(inicio), available: !pisado && !yaPaso && !muyPronto })
    }
  }
  return slots
}

// ---------------------------------------------------------------- alta de turno

/** Que el turno entre completo en el horario de atención de ese día. Lo usan el alta y la reprogramación. */
export async function validarHorarioDeAtencion(fecha: FechaISO, inicio: number, fin: number, duracionMin: number) {
  const horarios = (await listarHorarios()).filter((h) => h.diaSemana === diaSemanaISO(fecha))
  if (horarios.length === 0) {
    throw conflicto("Ese día el local no atiende.")
  }
  if (!horarios.some((h) => inicio >= aMinutos(h.desde) && fin <= aMinutos(h.hasta))) {
    throw conflicto(`El turno de ${duracionMin} minutos no entra en el horario de atención de ese día.`)
  }
}

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
  const problema = problemaDeAnticipacion(input.fecha, aMinutos(input.hora), { fecha: hoy(), minutos: minutosAhora() }, await leerReglasReserva())
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
    await validarHorarioDeAtencion(input.fecha, inicio, fin, servicio.duracionMin)
  }

  return enTransaccion(async (conn) => {
    const ocupados = [
      ...(await turnosDelDia(input.fecha, conn, true)),
      ...(await bloqueosDelDia(input.fecha, conn)),
    ]
    if (ocupados.some((o) => seSolapan(inicio, fin, o.desde, o.hasta))) {
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
