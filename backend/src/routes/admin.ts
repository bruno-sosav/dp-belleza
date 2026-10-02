import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { z } from "zod"
import { enTransaccion, pool } from "../db.js"
import { HttpError, noEncontrado } from "../errors.js"
import { requiereLogin } from "../middleware/auth.js"
import { aProducto, SELECT_PRODUCTO } from "../lib/productos.js"
import { ESTADOS_PEDIDO, puedeCambiarEstado, type EstadoPedido } from "../lib/pedidos.js"

// Todo lo de /admin requiere sesión iniciada.
export const admin = Router()
admin.use(requiereLogin)

const idParam = z.coerce.number().int().positive()

// ---------- Categorías ----------

const categoriaBody = z.object({
  nombre: z.string().trim().min(1).max(100),
  activo: z.boolean().optional(),
})

admin.get("/categorias", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, nombre, activo FROM categorias ORDER BY nombre")
  res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo) })))
})

admin.post("/categorias", async (req, res) => {
  const { nombre, activo = true } = categoriaBody.parse(req.body)
  const [r] = await pool.query<ResultSetHeader>("INSERT INTO categorias (nombre, activo) VALUES (?, ?)", [
    nombre,
    activo,
  ])
  res.status(201).json({ id: r.insertId, nombre, activo })
})

admin.patch("/categorias/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const cambios = categoriaBody.partial().parse(req.body)
  const [r] = await pool.query<ResultSetHeader>("UPDATE categorias SET ? WHERE id = ?", [cambios, id])
  if (!r.affectedRows) throw noEncontrado("Categoría")
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, nombre, activo FROM categorias WHERE id = ?", [id])
  res.json({ ...rows[0], activo: Boolean(rows[0].activo) })
})

// ---------- Productos ----------
// No hay DELETE: los productos se dan de baja con activo = false (los pedidos viejos los siguen referenciando).

const productoBody = z.object({
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  precio: z.number().nonnegative().max(99_999_999),
  stock: z.number().int().nonnegative(),
  imagenUrl: z.url().max(500).nullable().optional(),
  categoriaId: z.number().int().positive().nullable().optional(),
  activo: z.boolean().optional(),
})

// Pasa los nombres de la API a los de las columnas, solo con los campos presentes.
function aColumnas(p: Partial<z.infer<typeof productoBody>>) {
  const columnas: Record<string, unknown> = {
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    stock: p.stock,
    imagen_url: p.imagenUrl,
    categoria_id: p.categoriaId,
    activo: p.activo,
  }
  return Object.fromEntries(Object.entries(columnas).filter(([, v]) => v !== undefined))
}

async function buscarProducto(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_PRODUCTO} WHERE p.id = ?`, [id])
  if (!rows[0]) throw noEncontrado("Producto")
  return aProducto(rows[0])
}

admin.get("/productos", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_PRODUCTO} ORDER BY p.activo DESC, p.nombre`)
  res.json(rows.map(aProducto))
})

admin.get("/productos/:id", async (req, res) => {
  res.json(await buscarProducto(idParam.parse(req.params.id)))
})

admin.post("/productos", async (req, res) => {
  const datos = productoBody.parse(req.body)
  const [r] = await pool.query<ResultSetHeader>("INSERT INTO productos SET ?", [aColumnas(datos)])
  res.status(201).json(await buscarProducto(r.insertId))
})

admin.patch("/productos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const columnas = aColumnas(productoBody.partial().parse(req.body))
  if (!Object.keys(columnas).length) throw new HttpError(400, "No se envió ningún campo para modificar")
  const [r] = await pool.query<ResultSetHeader>("UPDATE productos SET ? WHERE id = ?", [columnas, id])
  if (!r.affectedRows) throw noEncontrado("Producto")
  res.json(await buscarProducto(id))
})

// ---------- Pedidos ----------

const filtrosPedidos = z.object({
  estado: z.enum(ESTADOS_PEDIDO).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
})

admin.get("/pedidos", async (req, res) => {
  const { estado, desde, hasta } = filtrosPedidos.parse(req.query)
  const condiciones: string[] = []
  const params: unknown[] = []
  if (estado) {
    condiciones.push("p.estado = ?")
    params.push(estado)
  }
  if (desde) {
    condiciones.push("p.created_at >= ?")
    params.push(desde)
  }
  if (hasta) {
    condiciones.push("p.created_at < DATE_ADD(?, INTERVAL 1 DAY)")
    params.push(hasta)
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.estado, p.total, p.notas, p.created_at, p.updated_at,
            c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
     FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT 500`,
    params,
  )
  res.json(rows.map(aPedido))
})

function aPedido(r: RowDataPacket) {
  return {
    id: r.id as number,
    estado: r.estado as EstadoPedido,
    total: r.total as number,
    notas: r.notas as string | null,
    unidades: r.unidades === undefined ? undefined : Number(r.unidades),
    cliente: { id: r.cliente_id, nombre: r.nombre, apellido: r.apellido, telefono: r.telefono, email: r.email },
    creadoEn: r.created_at as Date,
    actualizadoEn: r.updated_at as Date,
  }
}

async function buscarPedido(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.estado, p.total, p.notas, p.created_at, p.updated_at,
            c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email
     FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
    [id],
  )
  if (!rows[0]) throw noEncontrado("Pedido")
  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT i.producto_id, pr.nombre, i.cantidad, i.precio_unitario, i.subtotal
     FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id
     WHERE i.pedido_id = ? ORDER BY i.id`,
    [id],
  )
  const { unidades: _, ...pedido } = aPedido(rows[0])
  return {
    ...pedido,
    items: items.map((i) => ({
      productoId: i.producto_id as number,
      nombre: i.nombre as string,
      cantidad: i.cantidad as number,
      precioUnitario: i.precio_unitario as number,
      subtotal: i.subtotal as number,
    })),
  }
}

admin.get("/pedidos/:id", async (req, res) => {
  res.json(await buscarPedido(idParam.parse(req.params.id)))
})

admin.patch("/pedidos/:id/estado", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const { estado } = z.object({ estado: z.enum(ESTADOS_PEDIDO) }).parse(req.body)

  await enTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT estado FROM pedidos WHERE id = ? FOR UPDATE", [id])
    if (!rows[0]) throw noEncontrado("Pedido")
    const actual = rows[0].estado as EstadoPedido
    if (!puedeCambiarEstado(actual, estado)) {
      throw new HttpError(409, `No se puede pasar un pedido de "${actual}" a "${estado}"`)
    }
    await conn.query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id])
    // Al cancelar, el stock vuelve a estar disponible.
    if (estado === "cancelado") {
      await conn.query(
        `UPDATE productos pr JOIN pedido_items i ON i.producto_id = pr.id
         SET pr.stock = pr.stock + i.cantidad WHERE i.pedido_id = ?`,
        [id],
      )
    }
  })

  res.json(await buscarPedido(id))
})
