import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../shared/db.js"
import { noEncontrado } from "../shared/errors.js"
import { aProducto, SELECT_PRODUCTO } from "../shared/models/productos.js"
import { crearPedido } from "./service.js"
import { filtrosProductos, nuevoPedido } from "./validacion.js"

// Rutas públicas de la tienda, montadas en /api/tienda. Solo muestran lo que está activo.
export const tienda = Router()

tienda.get("/categorias", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY nombre",
  )
  res.json(rows)
})

tienda.get("/productos", async (req, res) => {
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

tienda.get("/productos/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id)
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_PRODUCTO} WHERE p.id = ? AND p.activo = 1`,
    [id],
  )
  if (!rows[0]) throw noEncontrado("Producto")
  res.json(aProducto(rows[0]))
})

// Checkout: el cliente no tiene cuenta, se identifica por teléfono.
tienda.post("/pedidos", async (req, res) => {
  const pedido = await crearPedido(nuevoPedido.parse(req.body))
  res.status(201).json(pedido)
})
