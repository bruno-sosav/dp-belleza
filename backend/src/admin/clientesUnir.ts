/**
 * Panel: unir dos fichas de la misma clienta.
 *
 * Pasa cuando la misma persona reservó con dos teléfonos (cambió de número, o
 * una vez reservó con el de la hija). Se elige con qué ficha quedarse; la otra
 * le pasa TODO (turnos, compras de la tienda, recordatorios ya mandados) y se
 * borra. Los datos que le falten a la que queda se completan con los de la
 * otra, y las notas se juntan.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import { z } from "zod"
import { enTransaccion, pool } from "../shared/db.js"
import { malaPeticion, noEncontrado } from "../shared/errors.js"

export const adminClientesUnir = Router()

const idParam = z.coerce.number().int().positive()

async function ficha(conn: PoolConnection | typeof pool, id: number, bloquear = false) {
  const [rows] = await conn.query<RowDataPacket[]>(`SELECT * FROM clientes WHERE id = ? ${bloquear ? "FOR UPDATE" : ""}`, [id])
  if (!rows[0]) throw noEncontrado("Cliente")
  return rows[0]
}

async function historial(conn: PoolConnection | typeof pool, id: number) {
  const [[r]] = await conn.query<RowDataPacket[]>(
    `SELECT (SELECT COUNT(*) FROM turnos  WHERE cliente_id = ?) AS turnos,
            (SELECT COUNT(*) FROM pedidos WHERE cliente_id = ?) AS compras`,
    [id, id],
  )
  return { turnos: Number(r.turnos), compras: Number(r.compras) }
}

/**
 * GET /api/admin/clientes/:id/posibles-duplicados
 *
 * Otras fichas que podrían ser la misma persona: mismo nombre y apellido, o
 * mismo email. Es una sugerencia; la dueña decide.
 */
adminClientesUnir.get("/clientes/:id/posibles-duplicados", async (req, res) => {
  const c = await ficha(pool, idParam.parse(req.params.id))
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, apellido, telefono, email FROM clientes
      WHERE id <> ?
        AND ((nombre = ? AND COALESCE(apellido, '') = COALESCE(?, '') AND ? IS NOT NULL)
             OR (email IS NOT NULL AND email = ?))
      LIMIT 10`,
    [c.id, c.nombre, c.apellido, c.apellido, c.email],
  )
  res.json(rows)
})

/**
 * POST /api/admin/clientes/:id/unir   { "otraId": 12, "telefonoDe": "esta" | "otra" }
 *
 * La ficha :id es la que queda. `telefonoDe` dice con qué teléfono se queda
 * (el de la otra, si es el número nuevo). Devuelve qué se movió.
 */
adminClientesUnir.post("/clientes/:id/unir", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const { otraId, telefonoDe } = z
    .object({ otraId: z.number().int().positive(), telefonoDe: z.enum(["esta", "otra"]).default("esta") })
    .parse(req.body)
  if (otraId === id) throw malaPeticion("No se puede unir una ficha consigo misma.")

  const movido = await enTransaccion(async (conn) => {
    // Siempre en el mismo orden (id menor primero), así dos uniones cruzadas no se bloquean entre sí.
    const [a, b] = await Promise.all([ficha(conn, Math.min(id, otraId), true), ficha(conn, Math.max(id, otraId), true)])
    const queda = a.id === id ? a : b
    const otra = a.id === id ? b : a
    const antes = await historial(conn, otra.id)

    await conn.query("UPDATE turnos  SET cliente_id = ? WHERE cliente_id = ?", [queda.id, otra.id])
    await conn.query("UPDATE pedidos SET cliente_id = ? WHERE cliente_id = ?", [queda.id, otra.id])
    // Recordatorios de cumpleaños: si las dos ya tenían el mismo saludo de ese año, queda uno solo.
    await conn.query(
      `DELETE r FROM recordatorios r
         JOIN recordatorios q ON q.cliente_id = ? AND q.tipo_id = r.tipo_id AND q.anio = r.anio
        WHERE r.cliente_id = ?`,
      [queda.id, otra.id],
    )
    await conn.query("UPDATE recordatorios SET cliente_id = ? WHERE cliente_id = ?", [queda.id, otra.id])

    const notas = [queda.notas, otra.notas].filter(Boolean).join("\n\n") || null
    await conn.query("DELETE FROM clientes WHERE id = ?", [otra.id])
    await conn.query(
      `UPDATE clientes SET
          apellido = COALESCE(apellido, ?), email = COALESCE(email, ?),
          cumple_dia = COALESCE(cumple_dia, ?), cumple_mes = COALESCE(cumple_mes, ?),
          notas = ?, telefono = ?
        WHERE id = ?`,
      [
        otra.apellido,
        otra.email,
        queda.cumple_dia ? null : otra.cumple_dia,
        queda.cumple_dia ? null : otra.cumple_mes,
        notas,
        // La otra ya se borró, así que su teléfono quedó libre (es UNIQUE).
        telefonoDe === "otra" ? otra.telefono : queda.telefono,
        queda.id,
      ],
    )
    return antes
  })

  res.json({ id, ...movido })
})
