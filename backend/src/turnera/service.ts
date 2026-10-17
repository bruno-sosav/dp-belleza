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
import { pool, enTransaccion } from "../shared/db.js"
import { leerConfigNumero } from "../shared/configuracion.js"
import { buscarOCrearCliente } from "../shared/models/clientes.js"
import { conflicto, malaPeticion, noExiste } from "../shared/errors.js"
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

// ---------------------------------------------------------------- servicios

/** Forma que espera el frontend (el tipo `Service` de @dp/shared/data/services). */
export type ServicioDTO = {
  id: number
  name: string
  category: string
  price: number
  durationMin: number
  image: string | null
  shortDescription: string | null
  description: string | null
  includes: string[]
  professional?: string
  badge?: string
  recommendedSessions?: number
}

export function aServicioDTO(row: RowDataPacket): ServicioDTO {
  return {
    id: row.id,
    name: row.nombre,
    category: row.categoria,
    price: row.precio,
    durationMin: row.duracion_min,
    image: row.imagen_url,
    shortDescription: row.descripcion_corta,
    description: row.descripcion,
    // `incluye` es una columna JSON: mysql2 la devuelve ya parseada.
    includes: Array.isArray(row.incluye) ? row.incluye : [],
    ...(row.profesional ? { professional: row.profesional } : {}),
    ...(row.badge ? { badge: row.badge } : {}),
    ...(row.sesiones_recomendadas ? { recommendedSessions: row.sesiones_recomendadas } : {}),
  }
}

export async function listarServicios(): Promise<ServicioDTO[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, categoria, descripcion_corta, descripcion, imagen_url,
            incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio
       FROM servicios
      WHERE activo = 1
      ORDER BY categoria, nombre`,
  )
  return rows.map(aServicioDTO)
}

export async function obtenerServicio(id: number): Promise<ServicioDTO> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, categoria, descripcion_corta, descripcion, imagen_url,
            incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio
       FROM servicios
      WHERE id = ? AND activo = 1`,
    [id],
  )
  if (rows.length === 0) throw noExiste(`No existe el servicio ${id}.`)
  return aServicioDTO(rows[0])
}

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
): Promise<SlotDTO[]> {
  const servicio = await obtenerServicio(servicioId)

  const horarios = (await listarHorarios()).filter((h) => h.diaSemana === diaSemanaISO(fecha))
  if (horarios.length === 0) return [] // cerrado

  const paso = await leerConfigNumero("intervalo_turnos_min", 15)
  const ocupados = [...(await turnosDelDia(fecha, undefined, false, excluirTurnoId)), ...(await bloqueosDelDia(fecha))]

  const esHoy = fecha === hoy()
  const ahora = minutosAhora()

  const slots: SlotDTO[] = []
  for (const horario of horarios) {
    const apertura = aMinutos(horario.desde)
    const cierre = aMinutos(horario.hasta)

    // El turno tiene que terminar antes del cierre, no solo empezar antes.
    for (let inicio = apertura; inicio + servicio.durationMin <= cierre; inicio += paso) {
      const fin = inicio + servicio.durationMin
      const pisado = ocupados.some((o) => seSolapan(inicio, fin, o.desde, o.hasta))
      const yaPaso = esHoy && inicio <= ahora
      slots.push({ time: aHora(inicio), available: !pisado && !yaPaso })
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
}

/**
 * Reserva un turno desde la web. La clienta no tiene cuenta: se la busca por
 * teléfono, o se la crea.
 */
export async function crearTurno(input: NuevoTurno): Promise<TurnoCreadoDTO> {
  return agendarTurno({
    servicioId: input.servicioId,
    fecha: input.fecha,
    hora: input.hora,
    notas: input.contacto.notas,
    estado: "reservado",
    respetarHorario: true,
    // Alta/reuso del cliente con la funcion COMPARTIDA con la tienda
    // (shared/models/clientes.ts): la misma persona que reserva un turno y
    // despues compra un producto tiene que ser una sola fila en `clientes`.
    cliente: (conn) => {
      const partes = input.contacto.nombreCompleto.trim().split(/\s+/)
      return buscarOCrearCliente(conn, {
        nombre: partes.length > 1 ? partes.slice(0, -1).join(" ") : partes[0],
        apellido: partes.length > 1 ? partes[partes.length - 1] : undefined,
        telefono: input.contacto.telefono,
        email: input.contacto.email,
        cumple: input.contacto.cumple,
      })
    },
  })
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
  const servicio = await obtenerServicio(input.servicioId)
  const inicio = aMinutos(input.hora)
  const fin = inicio + servicio.durationMin

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
    throw malaPeticion(`El turno de ${servicio.durationMin} minutos terminaría pasada la medianoche.`)
  }

  if (input.respetarHorario) {
    await validarHorarioDeAtencion(input.fecha, inicio, fin, servicio.durationMin)
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
           (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, estado, precio, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        servicio.id,
        aDateTime(input.fecha, inicio),
        aDateTime(input.fecha, fin),
        input.estado,
        // Precio congelado: si mañana sube la lista, este turno conserva el que
        // la clienta vio al reservar.
        servicio.price,
        input.notas ?? null,
      ],
    )
    const turnoId = (result as { insertId: number }).insertId

    return {
      id: turnoId,
      servicioId: servicio.id,
      servicio: servicio.name,
      clienteId,
      fecha: input.fecha,
      horaInicio: aHora(inicio),
      horaFin: aHora(fin),
      precio: servicio.price,
      estado: input.estado,
    }
  })
}
