/**
 * Panel: horario de atención y bloqueos (vacaciones, feriados, un rato puntual).
 *
 * Las dos cosas definen qué horarios ofrece la web (turnera/service.ts:
 * calcularDisponibilidad) y en qué horas deja reservar.
 *
 * Ninguna de las dos cancela turnos por su cuenta. Si un cambio deja turnos
 * pedidos afuera, se devuelven en la respuesta para que el panel se los muestre
 * a la dueña con el botón de WhatsApp: avisarle a la clienta y reprogramar es
 * decisión de ella, no del sistema.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { enTransaccion, pool } from "../core/database/conexion.js"
import { malaPeticion, noEncontrado } from "../core/errores.js"
import { entraEnHorario, problemaEnFranjas } from "../turnera/horarios.js"
import { listarHorarios } from "../turnera/service.js"
import { aDateTime, diaSemanaISO, hoy, minutosAhora } from "../turnera/tiempo.js"
import { fechaISO, horaHM } from "../turnera/validacion.js"
import { SELECT_TURNO, aTurno } from "./turnos.js"

export const adminAgenda = Router()

const idParam = z.coerce.number().int().positive()

const ahoraDateTime = () => aDateTime(hoy(), minutosAhora())

/** Turnos todavía por venir (los que una clienta espera que se cumplan). */
async function turnosPedidos(condicion: string, params: unknown[]) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TURNO}
      WHERE t.estado IN ('reservado', 'confirmado')
        AND t.fecha_hora_inicio >= ?
        AND ${condicion}
      ORDER BY t.fecha_hora_inicio`,
    [ahoraDateTime(), ...params],
  )
  return rows.map(aTurno)
}

// ---------------------------------------------------------------- horario

const franja = z.object({ diaSemana: z.number().int().min(1).max(7), desde: horaHM, hasta: horaHM })

/**
 * PUT /api/admin/horarios   { "franjas": [{ "diaSemana": 1, "desde": "09:00", "hasta": "19:00" }, ...] }
 *
 * Reemplaza el horario semanal entero: es como lo edita la dueña (la semana
 * completa en una pantalla) y evita estados a medias. Un día sin franjas queda
 * cerrado. Lectura: GET /api/turnos/horarios (público).
 *
 * Devuelve el horario nuevo y los turnos pedidos que quedaron fuera.
 */
adminAgenda.put("/horarios", async (req, res) => {
  const { franjas } = z.object({ franjas: z.array(franja).max(50) }).parse(req.body)
  const problema = problemaEnFranjas(franjas)
  if (problema) throw malaPeticion(problema)

  await enTransaccion(async (conn) => {
    await conn.query("DELETE FROM horarios_atencion")
    if (franjas.length) {
      await conn.query("INSERT INTO horarios_atencion (dia_semana, hora_inicio, hora_fin) VALUES ?", [
        franjas.map((f) => [f.diaSemana, f.desde, f.hasta]),
      ])
    }
  })

  const turnosFuera = (await turnosPedidos("1 = 1", [])).filter(
    (t) => !entraEnHorario(diaSemanaISO(t.fecha), t.horaInicio, t.horaFin, franjas),
  )
  res.json({ horarios: await listarHorarios(), turnosFuera })
})

// ---------------------------------------------------------------- bloqueos

function aBloqueo(r: RowDataPacket) {
  const desde = String(r.fecha_hora_inicio)
  const hasta = String(r.fecha_hora_fin)
  return {
    id: r.id as number,
    /** "2026-12-24 00:00" */
    desde: desde.slice(0, 16),
    hasta: hasta.slice(0, 16),
    motivo: r.motivo as string | null,
  }
}

/**
 * GET /api/admin/bloqueos?desde=2026-10-19&hasta=2026-10-25
 *
 * Sin parámetros: los que todavía no terminaron (lo que la dueña quiere
 * revisar). Con rango: los que pisan esos días (para dibujarlos en la agenda).
 */
adminAgenda.get("/bloqueos", async (req, res) => {
  const { desde, hasta } = z.object({ desde: fechaISO.optional(), hasta: fechaISO.optional() }).parse(req.query)
  const [rows] =
    desde && hasta
      ? await pool.query<RowDataPacket[]>(
          `SELECT * FROM bloqueos
            WHERE fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY) AND fecha_hora_fin > ?
            ORDER BY fecha_hora_inicio`,
          [hasta, desde],
        )
      : await pool.query<RowDataPacket[]>(
          "SELECT * FROM bloqueos WHERE fecha_hora_fin > ? ORDER BY fecha_hora_inicio LIMIT 200",
          [ahoraDateTime()],
        )
  res.json(rows.map(aBloqueo))
})

const fechaHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/, "Tiene que venir como YYYY-MM-DD HH:MM")
  .refine((v) => fechaISO.safeParse(v.slice(0, 10)).success, "Esa fecha no existe")

/**
 * POST /api/admin/bloqueos   { "desde": "2026-12-24 00:00", "hasta": "2026-12-26 00:00", "motivo": "Navidad" }
 *
 * Un día entero es de las 00:00 de ese día a las 00:00 del siguiente. Desde
 * que se guarda, la web deja de ofrecer esos horarios. Devuelve el bloqueo y
 * los turnos pedidos que caen adentro (no se cancelan solos).
 */
adminAgenda.post("/bloqueos", async (req, res) => {
  const datos = z
    .object({ desde: fechaHora, hasta: fechaHora, motivo: z.string().trim().max(255).optional() })
    .parse(req.body)
  // Strings "YYYY-MM-DD HH:MM": se comparan bien en orden alfabético.
  if (datos.hasta <= datos.desde) throw malaPeticion("El final tiene que ser después del comienzo.")
  if (datos.hasta <= ahoraDateTime().slice(0, 16)) throw malaPeticion("Ese período ya pasó.")

  const [r] = await pool.query<ResultSetHeader>(
    "INSERT INTO bloqueos (fecha_hora_inicio, fecha_hora_fin, motivo) VALUES (?, ?, ?)",
    [`${datos.desde}:00`, `${datos.hasta}:00`, datos.motivo || null],
  )
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM bloqueos WHERE id = ?", [r.insertId])
  const turnosAfectados = await turnosPedidos("t.fecha_hora_inicio < ? AND t.fecha_hora_fin > ?", [
    `${datos.hasta}:00`,
    `${datos.desde}:00`,
  ])
  res.status(201).json({ bloqueo: aBloqueo(rows[0]), turnosAfectados })
})

/** DELETE /api/admin/bloqueos/:id — se vuelve a atender en ese período. */
adminAgenda.delete("/bloqueos/:id", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM bloqueos WHERE id = ?", [idParam.parse(req.params.id)])
  if (r.affectedRows === 0) throw noEncontrado("Bloqueo")
  res.status(204).end()
})
