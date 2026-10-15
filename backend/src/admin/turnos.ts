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
import { bloqueosDelDia, turnosDelDia } from "../turnera/service.js"
import { aDateTime, aMinutos, hoy, minutosAhora, seSolapan } from "../turnera/tiempo.js"
import { fechaISO } from "../turnera/validacion.js"

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

const SELECT_TURNO = `
  SELECT t.id, t.estado, t.precio, t.notas, t.fecha_hora_inicio, t.fecha_hora_fin,
         s.id AS servicio_id, s.nombre AS servicio_nombre, s.duracion_min,
         c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes  c ON c.id = t.cliente_id`

function aTurno(r: RowDataPacket) {
  const inicio = String(r.fecha_hora_inicio)
  const fin = String(r.fecha_hora_fin)
  return {
    id: r.id as number,
    estado: r.estado as EstadoTurno,
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

adminTurnos.get("/turnos/:id", async (req, res) => {
  res.json(await buscarTurno(idParam.parse(req.params.id)))
})

/**
 * PATCH /api/admin/turnos/:id/estado   { "estado": "completado" }
 *
 * Reglas, además de las transiciones de turnera/estados.ts:
 *   - completado / ausente solo si el turno ya empezó (no se puede "no venir"
 *     a un turno de mañana).
 *   - si el turno vuelve a ocupar la agenda (deshacer un ausente), se revisa que
 *     el horario siga libre, igual que al reservar.
 *   - al cancelar, el recordatorio pendiente se cancela: no hay que mandarle
 *     WhatsApp a alguien por un turno que ya no existe.
 */
adminTurnos.patch("/turnos/:id/estado", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const { estado } = z.object({ estado: z.enum(ESTADOS_TURNO) }).parse(req.body)

  await enTransaccion(async (conn) => {
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

    await conn.query("UPDATE turnos SET estado = ? WHERE id = ?", [estado, id])

    if (estado === "cancelado") {
      await conn.query(
        "UPDATE recordatorios SET estado = 'cancelado' WHERE turno_id = ? AND estado = 'pendiente'",
        [id],
      )
    }
  })

  res.json(await buscarTurno(id))
})
