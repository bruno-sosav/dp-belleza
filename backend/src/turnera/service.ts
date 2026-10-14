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
import { db, transaction } from "../shared/db.ts"
import { leerConfigNumero } from "../shared/configuracion.ts"
import { obtenerOCrearCliente, partirNombre } from "../shared/clientes.ts"
import { badRequest, conflict, notFound } from "../shared/errors.ts"
import {
  aDateTime,
  aHora,
  aMinutos,
  diaSemanaISO,
  hoy,
  minutosAhora,
  seSolapan,
  type FechaISO,
} from "./tiempo.ts"
import type { NuevoTurno } from "./schemas.ts"

/** Estados que siguen ocupando lugar en la agenda. Un turno cancelado libera el horario. */
const ESTADOS_OCUPAN = ["reservado", "confirmado", "completado"] as const

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

function aServicioDTO(row: RowDataPacket): ServicioDTO {
  return {
    id: row.id,
    name: row.nombre,
    category: row.categoria,
    price: Number(row.precio),
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
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, categoria, descripcion_corta, descripcion, imagen_url,
            incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio
       FROM servicios
      WHERE activo = 1
      ORDER BY categoria, nombre`,
  )
  return rows.map(aServicioDTO)
}

export async function obtenerServicio(id: number): Promise<ServicioDTO> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, categoria, descripcion_corta, descripcion, imagen_url,
            incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio
       FROM servicios
      WHERE id = ? AND activo = 1`,
    [id],
  )
  if (rows.length === 0) throw notFound(`No existe el servicio ${id}.`)
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
  const [rows] = await db.query<RowDataPacket[]>(
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
async function turnosDelDia(
  fecha: FechaISO,
  conn?: PoolConnection,
  bloquear = false,
): Promise<Ocupado[]> {
  const ejecutor = conn ?? db
  const [rows] = await ejecutor.query<RowDataPacket[]>(
    `SELECT fecha_hora_inicio, fecha_hora_fin
       FROM turnos
      WHERE DATE(fecha_hora_inicio) = ?
        AND estado IN (?)
      ORDER BY fecha_hora_inicio
      ${bloquear ? "FOR UPDATE" : ""}`,
    [fecha, ESTADOS_OCUPAN],
  )
  return rows.map((r) => ({
    desde: aMinutos(String(r.fecha_hora_inicio).slice(11, 16)),
    hasta: aMinutos(String(r.fecha_hora_fin).slice(11, 16)),
  }))
}

/** Bloqueos (vacaciones, feriados, un rato puntual) que pisan ese día. */
async function bloqueosDelDia(fecha: FechaISO, conn?: PoolConnection): Promise<Ocupado[]> {
  const ejecutor = conn ?? db
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
): Promise<SlotDTO[]> {
  const servicio = await obtenerServicio(servicioId)

  const horarios = (await listarHorarios()).filter((h) => h.diaSemana === diaSemanaISO(fecha))
  if (horarios.length === 0) return [] // cerrado

  const paso = await leerConfigNumero("intervalo_turnos_min", 15)
  const ocupados = [...(await turnosDelDia(fecha)), ...(await bloqueosDelDia(fecha))]

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
 * Reserva un turno.
 *
 * Todo pasa dentro de una transacción, y la verificación de solapamiento se hace
 * con `FOR UPDATE` sobre los turnos del día. Sin eso, dos personas que reservan
 * el mismo horario al mismo tiempo pasan las dos la validación y el local queda
 * sobrevendido: la validación de disponibilidad del paso anterior no sirve como
 * garantía, porque entre que se consulta y se confirma pasa tiempo.
 */
export async function crearTurno(input: NuevoTurno): Promise<TurnoCreadoDTO> {
  const servicio = await obtenerServicio(input.servicioId)
  const inicio = aMinutos(input.hora)
  const fin = inicio + servicio.durationMin

  // No se puede reservar en el pasado.
  if (input.fecha < hoy() || (input.fecha === hoy() && inicio <= minutosAhora())) {
    throw badRequest("Ese horario ya pasó.")
  }

  const horarios = (await listarHorarios()).filter((h) => h.diaSemana === diaSemanaISO(input.fecha))
  if (horarios.length === 0) {
    throw conflict("Ese día el local no atiende.")
  }
  const entraEnAlgunHorario = horarios.some(
    (h) => inicio >= aMinutos(h.desde) && fin <= aMinutos(h.hasta),
  )
  if (!entraEnAlgunHorario) {
    throw conflict(
      `El turno de ${servicio.durationMin} minutos no entra en el horario de atención de ese día.`,
    )
  }

  return transaction(async (conn) => {
    const ocupados = [
      ...(await turnosDelDia(input.fecha, conn, true)),
      ...(await bloqueosDelDia(input.fecha, conn)),
    ]
    if (ocupados.some((o) => seSolapan(inicio, fin, o.desde, o.hasta))) {
      throw conflict("Ese horario ya fue reservado. Elegí otro.")
    }

    const { nombre, apellido } = partirNombre(input.contacto.nombreCompleto)
    const clienteId = await obtenerOCrearCliente(conn, {
      nombre,
      apellido,
      telefono: input.contacto.telefono,
      email: input.contacto.email ?? null,
    })

    const [result] = await conn.query(
      `INSERT INTO turnos
           (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, precio, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        servicio.id,
        aDateTime(input.fecha, inicio),
        aDateTime(input.fecha, fin),
        // Precio congelado: si mañana sube la lista, este turno conserva el que
        // la clienta vio al reservar.
        servicio.price,
        input.contacto.notas ?? null,
      ],
    )
    const turnoId = (result as { insertId: number }).insertId

    await programarRecordatorio(conn, turnoId, input.fecha, inicio)

    return {
      id: turnoId,
      servicioId: servicio.id,
      servicio: servicio.name,
      clienteId,
      fecha: input.fecha,
      horaInicio: aHora(inicio),
      horaFin: aHora(fin),
      precio: servicio.price,
      estado: "reservado",
    }
  })
}

/**
 * Deja el recordatorio de WhatsApp en la cola.
 *
 * Solo escribe la fila en `recordatorios`: quien los manda es otro proceso que
 * todavía no existe. Si la fecha de envío ya pasó (turno para dentro de menos
 * horas que la anticipación configurada), no se programa nada.
 */
async function programarRecordatorio(
  conn: PoolConnection,
  turnoId: number,
  fecha: FechaISO,
  inicioMin: number,
): Promise<void> {
  const horasAntes = await leerConfigNumero("recordatorio_horas_antes", 24)
  const [y, m, d] = fecha.split("-").map(Number)
  const envio = new Date(y, m - 1, d, Math.floor(inicioMin / 60), inicioMin % 60)
  envio.setHours(envio.getHours() - horasAntes)

  if (envio.getTime() <= Date.now()) return

  const pad = (n: number) => String(n).padStart(2, "0")
  const programado =
    `${envio.getFullYear()}-${pad(envio.getMonth() + 1)}-${pad(envio.getDate())} ` +
    `${pad(envio.getHours())}:${pad(envio.getMinutes())}:00`

  await conn.query(
    "INSERT INTO recordatorios (turno_id, programado_para) VALUES (?, ?)",
    [turnoId, programado],
  )
}
