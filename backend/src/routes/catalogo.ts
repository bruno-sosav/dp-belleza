import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../db.js"
import { noEncontrado } from "../errors.js"
import { aProducto, SELECT_PRODUCTO } from "../lib/productos.js"

// Rutas públicas de la tienda: solo muestran lo que está activo.
export const catalogo = Router()

catalogo.get("/categorias", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY nombre",
  )
  res.json(rows)
})

const filtrosProductos = z.object({
  categoria: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
})

catalogo.get("/productos", async (req, res) => {
  const { categoria, q } = filtrosProductos.parse(req.query)
  const condiciones = ["p.activo = 1", "(c.id IS NULL OR c.activo = 1)"]
  const params: unknown[] = []
  if (categoria) {
    condiciones.push("p.categoria_id = ?")
    params.push(categoria)
  }
  if (q) {
    condiciones.push("(p.nombre LIKE ? OR p.descripcion LIKE ?)")
    params.push(`%${q}%`, `%${q}%`)
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_PRODUCTO} WHERE ${condiciones.join(" AND ")} ORDER BY p.nombre`,
    params,
  )
  res.json(rows.map(aProducto))
})

catalogo.get("/productos/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id)
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_PRODUCTO} WHERE p.id = ? AND p.activo = 1`,
    [id],
  )
  if (!rows[0]) throw noEncontrado("Producto")
  res.json(aProducto(rows[0]))
})
