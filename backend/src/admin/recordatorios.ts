/**
 * Panel: recordatorios por WhatsApp.
 *
 * La dueña define TIPOS de recordatorio (tabla `tipos_recordatorio`): por
 * ejemplo "Confirmación, 48 hs antes" y "Recordatorio, 24 hs antes", cada uno
 * con su mensaje. A quién hay que mandarle qué se calcula en el momento
 * (turnera/recordatorios.ts: avisoQueToca), y `recordatorios` guarda lo que ya
 * se mandó u omitió, una fila por turno y tipo.
 *
 * No hay un proceso que los mande solo (eso necesita un proveedor pago de
 * WhatsApp): el panel abre WhatsApp con el mensaje escrito y la dueña lo envía.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { pool } from "../shared/db.js"
import { noEncontrado } from "../shared/errors.js"
import { leerConfigs } from "../shared/configuracion.js"
import { armarMensaje, avisoQueToca } from "../turnera/recordatorios.js"
import { aDateTime, fechaLarga, hoy, minutosAhora } from "../turnera/tiempo.js"

export const adminRecordatorios = Router()

const idParam = z.coerce.number().int().positive()

type Tipo = { id: number; nombre: string; horasAntes: number; mensaje: string }

async function listarTipos(): Promise<Tipo[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre, horas_antes, mensaje FROM tipos_recordatorio WHERE activo = 1 ORDER BY horas_antes DESC, id",
  )
  return rows.map((r) => ({ id: r.id, nombre: r.nombre, horasAntes: r.horas_antes, mensaje: r.mensaje }))
}

/** "2026-10-20 14:30:00" -> Date local. Las dos puntas de la cuenta se arman igual, así la zona horaria se cancela. */
function aFecha(dt: string) {
  const [f, h] = dt.split(" ")
  const [y, m, d] = f.split("-").map(Number)
  const [hh, mm] = h.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

const SELECT_TURNO = `
  SELECT t.id, t.fecha_hora_inicio, s.nombre AS servicio,
         c.id AS cliente_id, c.nombre, c.apellido, c.telefono
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes c  ON c.id = t.cliente_id`

function aItem(r: RowDataPacket, tipo: Tipo, negocio: string) {
  const inicio = String(r.fecha_hora_inicio)
  const fecha = inicio.slice(0, 10)
  const hora = inicio.slice(11, 16)
  return {
    tipo: { id: tipo.id, nombre: tipo.nombre },
    turno: { id: r.id as number, fecha, hora, servicio: r.servicio as string },
    cliente: {
      id: r.cliente_id as number,
      nombre: r.nombre as string,
      apellido: r.apellido as string | null,
      telefono: r.telefono as string,
    },
    mensaje: armarMensaje(tipo.mensaje, { nombre: r.nombre, servicio: r.servicio, fecha: fechaLarga(fecha), hora, negocio }),
  }
}

/**
 * GET /api/admin/recordatorios
 *
 *   paraMandar  turnos pedidos que hoy tienen un aviso por mandar, con el
 *               mensaje ya armado. Ordenados por turno, el más cercano primero.
 *   hechosHoy   lo que se mandó u omitió hoy, para poder deshacer.
 */
adminRecordatorios.get("/recordatorios", async (_req, res) => {
  const tipos = await listarTipos()
  const { nombre_negocio: negocio = "" } = await leerConfigs(["nombre_negocio"])
  const ahora = aDateTime(hoy(), minutosAhora())
  const maxHoras = Math.max(0, ...tipos.map((t) => t.horasAntes))

  const [turnos] = await pool.query<RowDataPacket[]>(
    `${SELECT_TURNO}
      WHERE t.estado IN ('reservado', 'confirmado')
        AND t.fecha_hora_inicio > ?
        AND t.fecha_hora_inicio <= DATE_ADD(?, INTERVAL ? HOUR)
      ORDER BY t.fecha_hora_inicio`,
    [ahora, ahora, maxHoras],
  )
  const [hechos] = turnos.length
    ? await pool.query<RowDataPacket[]>("SELECT turno_id, tipo_id FROM recordatorios WHERE turno_id IN (?)", [
        turnos.map((t) => t.id),
      ])
    : [[] as RowDataPacket[]]

  const paraMandar = turnos.flatMap((t) => {
    const horas = (aFecha(String(t.fecha_hora_inicio)).getTime() - aFecha(ahora).getTime()) / 3_600_000
    const hechosDelTurno = hechos.filter((h) => h.turno_id === t.id).map((h) => h.tipo_id as number)
    const tipo = avisoQueToca(horas, tipos, hechosDelTurno)
    return tipo ? [aItem(t, tipos.find((x) => x.id === tipo.id)!, negocio)] : []
  })

  const [deHoy] = await pool.query<RowDataPacket[]>(
    `${SELECT_TURNO.replace("SELECT t.id,", "SELECT r.id AS registro_id, r.estado, r.tipo_id, t.id,")}
      JOIN recordatorios r ON r.turno_id = t.id
     WHERE r.enviado_at >= ?
     ORDER BY r.enviado_at DESC`,
    [hoy()],
  )
  const [todosLosTipos] = await pool.query<RowDataPacket[]>("SELECT id, nombre, horas_antes, mensaje FROM tipos_recordatorio")
  const hechosHoy = deHoy.flatMap((r) => {
    const t = todosLosTipos.find((x) => x.id === r.tipo_id)
    if (!t) return []
    const tipo = { id: t.id, nombre: t.nombre, horasAntes: t.horas_antes, mensaje: t.mensaje }
    return [{ id: r.registro_id as number, estado: r.estado as "enviado" | "omitido", ...aItem(r, tipo, negocio) }]
  })

  res.json({ paraMandar, hechosHoy })
})

/**
 * POST /api/admin/recordatorios   { "turnoId": 12, "tipoId": 1, "estado": "enviado" }
 *
 * Marca un aviso como mandado, u "omitido" si no hacía falta (por ejemplo, el
 * turno lo arregló en persona y ya está confirmado).
 */
adminRecordatorios.post("/recordatorios", async (req, res) => {
  const datos = z
    .object({ turnoId: z.number().int().positive(), tipoId: z.number().int().positive(), estado: z.enum(["enviado", "omitido"]) })
    .parse(req.body)
  const [r] = await pool.query<ResultSetHeader>(
    `INSERT INTO recordatorios (turno_id, tipo_id, estado, enviado_at, intentos) VALUES (?, ?, ?, NOW(), 1)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), enviado_at = NOW(), intentos = intentos + 1`,
    [datos.turnoId, datos.tipoId, datos.estado],
  )
  res.status(201).json({ id: r.insertId })
})

/** DELETE /api/admin/recordatorios/:id — deshacer: el aviso vuelve a "para mandar". */
adminRecordatorios.delete("/recordatorios/:id", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM recordatorios WHERE id = ?", [idParam.parse(req.params.id)])
  if (r.affectedRows === 0) throw noEncontrado("Recordatorio")
  res.status(204).end()
})

// ---------------------------------------------------------------- tipos

const datosTipo = z.object({
  nombre: z.string().trim().min(1).max(100),
  // Hasta una semana antes: más que eso ya no es un recordatorio.
  horasAntes: z.number().int().min(1).max(168),
  mensaje: z.string().trim().min(10).max(1000),
})

function aTipo(r: RowDataPacket): Tipo {
  return { id: r.id, nombre: r.nombre, horasAntes: r.horas_antes, mensaje: r.mensaje }
}

async function buscarTipo(id: number): Promise<Tipo> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM tipos_recordatorio WHERE id = ? AND activo = 1", [id])
  if (!rows[0]) throw noEncontrado("Tipo de recordatorio")
  return aTipo(rows[0])
}

/** GET /api/admin/recordatorios/tipos — del que va más temprano al más cercano al turno. */
adminRecordatorios.get("/recordatorios/tipos", async (_req, res) => {
  res.json(await listarTipos())
})

adminRecordatorios.post("/recordatorios/tipos", async (req, res) => {
  const d = datosTipo.parse(req.body)
  const [r] = await pool.query<ResultSetHeader>(
    "INSERT INTO tipos_recordatorio (nombre, horas_antes, mensaje) VALUES (?, ?, ?)",
    [d.nombre, d.horasAntes, d.mensaje],
  )
  res.status(201).json(await buscarTipo(r.insertId))
})

adminRecordatorios.patch("/recordatorios/tipos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const d = datosTipo.partial().parse(req.body)
  const columnas: Record<string, unknown> = {}
  if (d.nombre !== undefined) columnas.nombre = d.nombre
  if (d.horasAntes !== undefined) columnas.horas_antes = d.horasAntes
  if (d.mensaje !== undefined) columnas.mensaje = d.mensaje
  if (Object.keys(columnas).length) {
    const [r] = await pool.query<ResultSetHeader>("UPDATE tipos_recordatorio SET ? WHERE id = ? AND activo = 1", [columnas, id])
    if (r.affectedRows === 0) throw noEncontrado("Tipo de recordatorio")
  }
  res.json(await buscarTipo(id))
})

/**
 * DELETE /api/admin/recordatorios/tipos/:id
 *
 * Se desactiva en vez de borrarse, así el registro de lo ya mandado no se
 * pierde. Para la dueña es lo mismo: deja de existir.
 */
adminRecordatorios.delete("/recordatorios/tipos/:id", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("UPDATE tipos_recordatorio SET activo = 0 WHERE id = ? AND activo = 1", [
    idParam.parse(req.params.id),
  ])
  if (r.affectedRows === 0) throw noEncontrado("Tipo de recordatorio")
  res.status(204).end()
})
