/**
 * Panel: la agenda del día y el cambio de estado de los turnos.
 *
 * Esto es lo que alimenta las estadísticas: la plata de los turnos sale SOLO de
 * los que están en `completado`, y la única forma de llegar ahí es que la dueña
 * lo marque desde acá. Sin este endpoint, un turno reservado por la web quedaba
 * `reservado` para siempre y nunca sumaba.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import { z } from "zod"
import { enTransaccion, pool } from "../shared/db.js"
import { HttpError, conflicto, malaPeticion, noEncontrado } from "../shared/errors.js"
import {
  ESTADOS_TURNO,
  ocupaAgenda,
  puedeCambiarEstadoTurno,
  requiereHaberEmpezado,
  type EstadoTurno,
} from "../turnera/estados.js"
import {
  agendarTurno,
  bloqueosDelDia,
  calcularDisponibilidad,
  obtenerServicio,
  turnosDelDia,
  validarHorarioDeAtencion,
  yaEmpezo,
} from "../turnera/service.js"
import { aDateTime, aMinutos, hoy, minutosAhora, seSolapan } from "../turnera/tiempo.js"
import type { FechaISO } from "../turnera/tiempo.js"
import { consultaDisponibilidad, fechaISO, horaHM } from "../turnera/validacion.js"
import { MEDIOS_PAGO, registrarCobro } from "../shared/models/cobros.js"

export const adminTurnos = Router()

const idParam = z.coerce.number().int().positive()

/** Hasta dos meses por pedido: alcanza para cualquier vista de agenda. */
const MAX_DIAS_RANGO = 62

const filtrosTurnos = z
  .object({
    desde: fechaISO.optional(),
    hasta: fechaISO.optional(),
    estado: z.enum(ESTADOS_TURNO).optional(),
  })
  .transform((f) => ({ ...f, desde: f.desde ?? hoy(), hasta: f.hasta ?? f.desde ?? hoy() }))
  .refine((f) => f.desde <= f.hasta, { message: "`desde` no puede ser posterior a `hasta`", path: ["hasta"] })
  .refine((f) => diasEntre(f.desde, f.hasta) <= MAX_DIAS_RANGO, {
    message: `El rango no puede superar los ${MAX_DIAS_RANGO} días`,
    path: ["hasta"],
  })

function diasEntre(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split("-").map(Number)
  const [y2, m2, d2] = hasta.split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export const SELECT_TURNO = `
  SELECT t.id, t.estado, t.cancelado_por, t.precio, t.sena_monto, t.sena_estado, t.notas, t.fecha_hora_inicio, t.fecha_hora_fin,
         (SELECT COALESCE(SUM(cb.monto), 0) FROM cobros cb WHERE cb.turno_id = t.id) AS cobrado,
         s.id AS servicio_id, s.nombre AS servicio_nombre, s.duracion_min,
         c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes  c ON c.id = t.cliente_id`

export function aTurno(r: RowDataPacket) {
  const inicio = String(r.fecha_hora_inicio)
  const fin = String(r.fecha_hora_fin)
  return {
    id: r.id as number,
    estado: r.estado as EstadoTurno,
    /** Solo en cancelados: "clienta" si lo canceló ella desde la web. */
    canceladoPor: (r.cancelado_por ?? null) as "local" | "clienta" | "sistema" | null,
    /** Solo turnos reservados en la web con seña. */
    /** Lo que ya entró a la caja por este turno (seña + lo cobrado al terminar). */
    cobrado: Number(r.cobrado ?? 0),
    sena: r.sena_estado ? { monto: Number(r.sena_monto), estado: r.sena_estado as "pendiente" | "pagada" | "vencida" } : null,
    // "2026-10-20 14:30:00" -> fecha y hora por separado. Se cortan strings y
    // no se pasa por Date por lo explicado en shared/db.ts (dateStrings).
    fecha: inicio.slice(0, 10),
    horaInicio: inicio.slice(11, 16),
    horaFin: fin.slice(11, 16),
    precio: r.precio as number,
    notas: r.notas as string | null,
    servicio: { id: r.servicio_id as number, nombre: r.servicio_nombre as string, duracionMin: r.duracion_min as number },
    cliente: {
      id: r.cliente_id as number,
      nombre: r.nombre as string,
      apellido: r.apellido as string | null,
      telefono: r.telefono as string,
      email: r.email as string | null,
    },
  }
}

async function buscarTurno(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_TURNO} WHERE t.id = ?`, [id])
  if (!rows[0]) throw noEncontrado("Turno")
  return aTurno(rows[0])
}

/**
 * GET /api/admin/turnos?desde=2026-10-15&hasta=2026-10-21&estado=reservado
 *
 * Sin parámetros devuelve los turnos de HOY. Ordenados por horario, que es como
 * los lee la dueña. Incluye cancelados y ausentes: el filtro lo decide el panel.
 */
adminTurnos.get("/turnos", async (req, res) => {
  const { desde, hasta, estado } = filtrosTurnos.parse(req.query)
  const condiciones = ["t.fecha_hora_inicio >= ?", "t.fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY)"]
  const params: unknown[] = [desde, hasta]
  if (estado) {
    condiciones.push("t.estado = ?")
    params.push(estado)
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TURNO}
      WHERE ${condiciones.join(" AND ")}
      ORDER BY t.fecha_hora_inicio, t.id
      LIMIT 1000`,
    params,
  )
  res.json(rows.map(aTurno))
})

/**
 * GET /api/admin/turnos/disponibilidad?servicioId=2&fecha=2026-10-20&excluir=15
 *
 * Igual que la de la web, pero con `excluir`: al reprogramar un turno, el
 * horario que ocupa él mismo tiene que aparecer libre. Va antes de
 * /turnos/:id para que "disponibilidad" no se lea como un id.
 */
adminTurnos.get("/turnos/disponibilidad", async (req, res) => {
  const { servicioId, fecha } = consultaDisponibilidad.parse(req.query)
  const { excluir } = z.object({ excluir: idParam.optional() }).parse(req.query)
  res.json(await calcularDisponibilidad(servicioId, fecha, excluir))
})

adminTurnos.get("/turnos/:id", async (req, res) => {
  res.json(await buscarTurno(idParam.parse(req.params.id)))
})

/**
 * POST /api/admin/turnos
 *   { "clienteId": 4, "servicioId": 2, "fecha": "2026-10-20", "hora": "14:30",
 *     "notas": "Viene con la hija", "fueraDeHorario": false }
 *
 * Un turno que carga la dueña (le escribieron por WhatsApp, la llamaron, se
 * lo pidieron en el local). Usa la misma función que la reserva de la web, así
 * que tampoco puede pisar otro turno ni un bloqueo. Diferencias:
 *   - la clienta ya existe: se elige de la lista (o se la da de alta antes con
 *     POST /clientes), no se la busca por teléfono.
 *   - entra como `confirmado`: lo arregló ella misma, no hay nada que confirmar.
 *   - si el horario ya pasó, entra como `completado`: es alguien que vino sin
 *     turno y la dueña lo registra para que sume en Finanzas. Ahí no se mira
 *     el horario de atención (ya pasó), pero tampoco puede pisar otro turno.
 *   - con `fueraDeHorario: true` se puede dar fuera del horario de atención.
 *     Va explícito para que el panel pregunte antes, y no se cuele por error.
 */
const nuevoTurnoAdmin = z.object({
  clienteId: z.number().int().positive(),
  servicioId: z.number().int().positive(),
  fecha: fechaISO,
  hora: horaHM,
  notas: z.string().trim().max(1000).optional(),
  fueraDeHorario: z.boolean().default(false),
})

adminTurnos.post("/turnos", async (req, res) => {
  const datos = nuevoTurnoAdmin.parse(req.body)
  const pasado = yaEmpezo(datos.fecha, aMinutos(datos.hora))
  const creado = await agendarTurno({
    servicioId: datos.servicioId,
    fecha: datos.fecha,
    hora: datos.hora,
    notas: datos.notas || undefined,
    estado: pasado ? "completado" : "confirmado",
    respetarHorario: !pasado && !datos.fueraDeHorario,
    cliente: async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM clientes WHERE id = ?", [datos.clienteId])
      if (!rows[0]) throw noEncontrado("Cliente")
      return datos.clienteId
    },
  })
  res.status(201).json(await buscarTurno(creado.id))
})

/**
 * PATCH /api/admin/turnos/:id
 *   { "fecha": "2026-10-22", "hora": "16:00", "servicioId": 3, "notas": "…", "fueraDeHorario": false }
 *
 * Reprogramar o corregir un turno. Todo es opcional: lo que no viene, no cambia.
 *
 *   - La nota se puede editar siempre, hasta en un cancelado.
 *   - Día, hora y servicio: un cancelado no se toca (liberó el horario; si
 *     vuelve, es un turno nuevo). Uno pedido (reservado/confirmado) se mueve
 *     solo para adelante. Uno completado o "no vino" es historia: se puede
 *     corregir, pero tiene que seguir en el pasado.
 *   - Si cambia el servicio, el turno toma la duración y el precio ACTUALES del
 *     servicio nuevo. Si no cambia, conserva los suyos (el precio que vio la
 *     clienta al reservar).
 *   - Nunca puede pisar otro turno ni un bloqueo, igual que al reservar.
 *   - Si se movió un turno pedido de día u hora, los recordatorios que ya se le
 *     habían mandado se borran: hay que avisarle de nuevo con la fecha nueva.
 */
const cambiosTurno = z.object({
  fecha: fechaISO.optional(),
  hora: horaHM.optional(),
  servicioId: z.number().int().positive().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
  fueraDeHorario: z.boolean().default(false),
})

adminTurnos.patch("/turnos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const cambios = cambiosTurno.parse(req.body)

  await enTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT estado, servicio_id, precio, fecha_hora_inicio, fecha_hora_fin FROM turnos WHERE id = ? FOR UPDATE",
      [id],
    )
    if (!rows[0]) throw noEncontrado("Turno")
    const actual = rows[0]
    const estado = actual.estado as EstadoTurno
    const inicioActual = String(actual.fecha_hora_inicio)
    const fechaActual = inicioActual.slice(0, 10)
    const desdeActual = aMinutos(inicioActual.slice(11, 16))
    const duracionActual = aMinutos(String(actual.fecha_hora_fin).slice(11, 16)) - desdeActual

    const fecha: FechaISO = cambios.fecha ?? fechaActual
    const desde = cambios.hora ? aMinutos(cambios.hora) : desdeActual
    const cambiaServicio = cambios.servicioId !== undefined && cambios.servicioId !== actual.servicio_id
    const mueve = fecha !== fechaActual || desde !== desdeActual || cambiaServicio

    const columnas: Record<string, unknown> = {}
    if (cambios.notas !== undefined) columnas.notas = cambios.notas || null

    if (mueve) {
      if (estado === "cancelado") {
        throw conflicto("Un turno cancelado no se puede cambiar de día. Dale un turno nuevo.")
      }
      const pedido = estado === "reservado" || estado === "confirmado"
      const pasado = yaEmpezo(fecha, desde)
      if (pedido && pasado) throw malaPeticion("Ese horario ya pasó. Elegí uno de ahora en adelante.")
      if (!pedido && !pasado) {
        throw malaPeticion(`Este turno figura como ${estado === "completado" ? "completado" : "\"no vino\""}: solo se puede corregir a un horario que ya pasó.`)
      }

      let duracion = duracionActual
      if (cambiaServicio) {
        const servicio = await obtenerServicio(cambios.servicioId!)
        duracion = servicio.durationMin
        columnas.servicio_id = servicio.id
        columnas.precio = servicio.price
      }
      const hasta = desde + duracion
      if (hasta > 24 * 60) throw malaPeticion(`El turno de ${duracion} minutos terminaría pasada la medianoche.`)
      if (!pasado && !cambios.fueraDeHorario) await validarHorarioDeAtencion(fecha, desde, hasta, duracion)

      // Un "no vino" no ocupa la agenda (otra persona pudo tomar el horario),
      // así que no se lo controla contra los demás.
      if (estado !== "ausente") {
        const ocupados = [...(await turnosDelDia(fecha, conn, true, id)), ...(await bloqueosDelDia(fecha, conn))]
        if (ocupados.some((o) => seSolapan(desde, hasta, o.desde, o.hasta))) {
          throw conflicto("Ese horario ya lo ocupa otro turno o un bloqueo.")
        }
      }

      columnas.fecha_hora_inicio = aDateTime(fecha, desde)
      columnas.fecha_hora_fin = aDateTime(fecha, hasta)

      if (pedido && (fecha !== fechaActual || desde !== desdeActual)) {
        await conn.query("DELETE FROM recordatorios WHERE turno_id = ?", [id])
      }
    }

    if (Object.keys(columnas).length) {
      await conn.query("UPDATE turnos SET ? WHERE id = ?", [columnas, id])
    }
  })

  res.json(await buscarTurno(id))
})

/**
 * PATCH /api/admin/turnos/:id/estado   { "estado": "completado" }
 *
 * Reglas, además de las transiciones de turnera/estados.ts:
 *   - completado / ausente solo si el turno ya empezó (no se puede "no venir"
 *     a un turno de mañana).
 *   - si el turno vuelve a ocupar la agenda (deshacer un ausente), se revisa que
 *     el horario siga libre, igual que al reservar.
 *   - un turno cancelado deja de aparecer solo en Recordatorios (la lista se
 *     arma con los turnos pedidos), no hay nada que limpiar.
 */
/**
 * Cambia el estado de un turno dentro de una transacción, con todas las reglas.
 * Lo usan PATCH /estado y POST /completar (que además anota el cobro).
 */
async function cambiarEstado(conn: PoolConnection, id: number, estado: EstadoTurno) {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT estado, fecha_hora_inicio, fecha_hora_fin FROM turnos WHERE id = ? FOR UPDATE",
    [id],
  )
  if (!rows[0]) throw noEncontrado("Turno")
  const actual = rows[0].estado as EstadoTurno
  const inicio = String(rows[0].fecha_hora_inicio)
  const fin = String(rows[0].fecha_hora_fin)

  if (actual === estado) return
  if (!puedeCambiarEstadoTurno(actual, estado)) {
    throw new HttpError(409, `No se puede pasar un turno de "${actual}" a "${estado}"`)
  }

  // Strings "YYYY-MM-DD HH:MM:SS": se comparan bien en orden alfabético.
  const ahora = aDateTime(hoy(), minutosAhora())
  if (requiereHaberEmpezado(estado) && inicio > ahora) {
    throw malaPeticion(`Todavía no es la hora del turno: no se puede marcar como "${estado}".`)
  }

  if (ocupaAgenda(estado) && !ocupaAgenda(actual)) {
    const fecha = inicio.slice(0, 10)
    const desde = aMinutos(inicio.slice(11, 16))
    const hasta = aMinutos(fin.slice(11, 16))
    const ocupados = [...(await turnosDelDia(fecha, conn, true)), ...(await bloqueosDelDia(fecha, conn))]
    if (ocupados.some((o) => seSolapan(desde, hasta, o.desde, o.hasta))) {
      throw conflicto("Ese horario ya lo ocupa otro turno o un bloqueo.")
    }
  }

  await conn.query(
    estado === "cancelado"
      ? "UPDATE turnos SET estado = ?, cancelado_por = 'local', cancelado_at = NOW() WHERE id = ?"
      : "UPDATE turnos SET estado = ? WHERE id = ?",
    [estado, id],
  )

  // Deshacer un "completado" (tocó el botón equivocado): lo que se anotó como
  // cobrado al terminar el turno sale de la caja. La seña no, esa se pagó igual.
  if (actual === "completado") {
    await conn.query("DELETE FROM cobros WHERE turno_id = ? AND concepto = 'turno'", [id])
  }
}

adminTurnos.patch("/turnos/:id/estado", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const { estado } = z.object({ estado: z.enum(ESTADOS_TURNO) }).parse(req.body)
  await enTransaccion((conn) => cambiarEstado(conn, id, estado))
  res.json(await buscarTurno(id))
})

/**
 * POST /api/admin/turnos/:id/completar   { "cobro": { "monto": 16800, "medio": "efectivo" } }
 *
 * Marca el turno como completado y, en la misma operación, anota lo que se
 * cobró. `cobro: null` = "todavía no cobré" (queda en Caja → sin cobrar).
 */
adminTurnos.post("/turnos/:id/completar", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const { cobro } = z
    .object({
      cobro: z.object({ monto: z.number().positive().max(100_000_000), medio: z.enum(MEDIOS_PAGO) }).nullable(),
    })
    .parse(req.body)
  await enTransaccion(async (conn) => {
    await cambiarEstado(conn, id, "completado")
    if (cobro) {
      const [[t]] = await conn.query<RowDataPacket[]>("SELECT cliente_id FROM turnos WHERE id = ?", [id])
      await registrarCobro(conn, { ...cobro, concepto: "turno", turnoId: id, clienteId: t.cliente_id })
    }
  })
  res.json(await buscarTurno(id))
})
