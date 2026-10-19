/**
 * Panel: Finanzas → Caja. Lo que entró cada día, por medio de pago.
 *
 * Los cobros llegan de tres lados: al completar un turno (admin/turnos.ts,
 * POST /completar), la seña de Mercado Pago (turnera/sena.ts, sola) y lo que
 * la dueña anota a mano acá (POST /cobros), por ejemplo un turno que alguien
 * pagó antes, o cualquier otra entrada.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { z } from "zod"
import { enTransaccion, pool } from "../core/database/conexion.js"
import { conflicto, malaPeticion, noEncontrado } from "../core/errores.js"
import { CONCEPTOS_COBRO, MEDIOS_PAGO, registrarCobro } from "../shared/models/cobros.js"
import type { MedioPago } from "../shared/models/cobros.js"
import { hoy } from "../core/tiempo.js"
import { fechaISO } from "../turnera/validacion.js"

export const adminCaja = Router()

const idParam = z.coerce.number().int().positive()

function aCobro(r: RowDataPacket) {
  return {
    id: r.id as number,
    /** "2026-10-19 14:32" */
    fechaHora: String(r.fecha_hora).slice(0, 16),
    monto: Number(r.monto),
    medio: r.medio as MedioPago,
    concepto: r.concepto as "sena" | "turno" | "otro",
    descripcion: r.descripcion as string | null,
    /** Del turno, si es de un turno. */
    turno: r.turno_id ? { id: r.turno_id as number, servicio: r.servicio as string, fecha: String(r.turno_inicio).slice(0, 10), hora: String(r.turno_inicio).slice(11, 16) } : null,
    cliente: r.cliente_id ? { id: r.cliente_id as number, nombre: [r.nombre, r.apellido].filter(Boolean).join(" ") } : null,
  }
}

/**
 * GET /api/admin/caja?fecha=2026-10-19
 *
 *   cobros     lo que entró ese día, del más nuevo al más viejo
 *   totales    por medio de pago, y el total
 *   sinCobrar  turnos completados ese día que todavía no se cobraron enteros
 *              (para que no se escape ninguno)
 */
adminCaja.get("/caja", async (req, res) => {
  const { fecha = hoy() } = z.object({ fecha: fechaISO.optional() }).parse(req.query)

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT cb.*, s.nombre AS servicio, t.fecha_hora_inicio AS turno_inicio, c.nombre, c.apellido
       FROM cobros cb
       LEFT JOIN turnos t    ON t.id = cb.turno_id
       LEFT JOIN servicios s ON s.id = t.servicio_id
       LEFT JOIN clientes c  ON c.id = cb.cliente_id
      WHERE cb.fecha_hora >= ? AND cb.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY cb.fecha_hora DESC, cb.id DESC`,
    [fecha, fecha],
  )
  const cobros = rows.map(aCobro)

  const porMedio = Object.fromEntries(MEDIOS_PAGO.map((m) => [m, 0])) as Record<MedioPago, number>
  for (const c of cobros) porMedio[c.medio] += c.monto

  const [pendientes] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.fecha_hora_inicio, t.precio, s.nombre AS servicio, c.id AS cliente_id, c.nombre, c.apellido,
            (SELECT COALESCE(SUM(cb.monto), 0) FROM cobros cb WHERE cb.turno_id = t.id) AS cobrado
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
       JOIN clientes c  ON c.id = t.cliente_id
      WHERE t.estado = 'completado'
        AND t.fecha_hora_inicio >= ? AND t.fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY)
      HAVING cobrado < t.precio
      ORDER BY t.fecha_hora_inicio`,
    [fecha, fecha],
  )

  res.json({
    fecha,
    cobros,
    totales: { porMedio, total: cobros.reduce((s, c) => s + c.monto, 0) },
    sinCobrar: pendientes.map((p) => ({
      turnoId: p.id as number,
      hora: String(p.fecha_hora_inicio).slice(11, 16),
      servicio: p.servicio as string,
      cliente: { id: p.cliente_id as number, nombre: [p.nombre, p.apellido].filter(Boolean).join(" ") },
      precio: Number(p.precio),
      cobrado: Number(p.cobrado),
      falta: Number(p.precio) - Number(p.cobrado),
    })),
  })
})

/**
 * POST /api/admin/cobros
 *   { "monto": 15000, "medio": "efectivo", "concepto": "turno", "turnoId": 12 }
 *   { "monto": 3000, "medio": "transferencia", "concepto": "otro", "descripcion": "Gift card" }
 *
 * Con turno, la clienta sale del turno. "otro" necesita una descripción, para
 * saber después qué fue esa plata.
 */
adminCaja.post("/cobros", async (req, res) => {
  const d = z
    .object({
      monto: z.number().positive().max(100_000_000),
      medio: z.enum(MEDIOS_PAGO),
      concepto: z.enum(CONCEPTOS_COBRO),
      turnoId: z.number().int().positive().optional(),
      descripcion: z.string().trim().max(255).optional(),
    })
    .parse(req.body)
  if (d.concepto !== "otro" && !d.turnoId) throw malaPeticion("Un cobro de seña o de turno tiene que decir de qué turno es.")
  if (d.concepto === "otro" && !d.descripcion) throw malaPeticion("Contá en una línea qué es este cobro (por ejemplo, “gift card”).")

  const id = await enTransaccion(async (conn) => {
    let clienteId: number | null = null
    if (d.turnoId) {
      const [[t]] = await conn.query<RowDataPacket[]>("SELECT cliente_id FROM turnos WHERE id = ?", [d.turnoId])
      if (!t) throw noEncontrado("Turno")
      clienteId = t.cliente_id
    }
    return registrarCobro(conn, { ...d, clienteId })
  })
  res.status(201).json({ id })
})

/**
 * DELETE /api/admin/cobros/:id — para corregir uno anotado por error.
 * Los de Mercado Pago no: son pagos reales, se devuelven desde Mercado Pago.
 */
adminCaja.delete("/cobros/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const [[c]] = await pool.query<RowDataPacket[]>("SELECT mp_pago_id FROM cobros WHERE id = ?", [id])
  if (!c) throw noEncontrado("Cobro")
  if (c.mp_pago_id) throw conflicto("Ese cobro es un pago de Mercado Pago: no se borra desde acá. Si hay que devolverlo, se hace desde Mercado Pago.")
  await pool.query<ResultSetHeader>("DELETE FROM cobros WHERE id = ?", [id])
  res.status(204).end()
})
