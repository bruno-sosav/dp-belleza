import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { enTransaccion, pool } from "../core/database/conexion.database.js"
import { HttpError, noEncontrado } from "../core/negocio.error.js"
import { inventario } from "../modules/inventory/inventory.module.js"
import { comoTransaccion } from "../core/database/unidadDeTrabajo.database.js"
import { ESTADOS_PEDIDO, puedeCambiarEstado, type EstadoPedido } from "../shared/models/pedidos.js"

// Panel: pedidos de la tienda. Categorías y productos están en el módulo de
// catálogo (modules/catalog). El login lo exige admin/index.ts.
export const adminTienda = Router()

const idParam = z.coerce.number().int().positive()

// ---------- Pedidos ----------

const filtrosPedidos = z.object({
  estado: z.enum(ESTADOS_PEDIDO).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
})

adminTienda.get("/pedidos", async (req, res) => {
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

adminTienda.get("/pedidos/:id", async (req, res) => {
  res.json(await buscarPedido(idParam.parse(req.params.id)))
})

adminTienda.patch("/pedidos/:id/estado", async (req, res) => {
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
    // Al cancelar, el stock vuelve a estar disponible (lo hace el inventario).
    if (estado === "cancelado") {
      const [items] = await conn.query<RowDataPacket[]>("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?", [id])
      await inventario.devolver(
        items.map((i) => ({ productoId: i.producto_id as number, cantidad: Number(i.cantidad) })),
        comoTransaccion(conn),
      )
    }
  })

  res.json(await buscarPedido(id))
})
