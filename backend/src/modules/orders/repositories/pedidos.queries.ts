/** Vistas de lectura de pedidos para el panel. Hacen JOIN con `clientes` y `productos`, nunca los escriben. */
import type { RowDataPacket } from "mysql2"
import { pool } from "../../../core/database/conexion.database.js"
import type { PedidosQueries } from "../models/pedidos.ports.js"
import type { EstadoPedido, FiltrosPedidos, PedidoResumen } from "../models/pedido.model.js"

const COLUMNAS = `p.id, p.estado, p.total, p.notas, p.created_at, p.updated_at,
  c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email`

function aResumen(r: RowDataPacket): PedidoResumen {
  return {
    id: r.id as number,
    estado: r.estado as EstadoPedido,
    total: Number(r.total),
    notas: r.notas as string | null,
    unidades: Number(r.unidades ?? 0),
    cliente: { id: r.cliente_id, nombre: r.nombre, apellido: r.apellido, telefono: r.telefono, email: r.email },
    creadoEn: r.created_at as string,
    actualizadoEn: r.updated_at as string,
  }
}

export class MySqlPedidosQueries implements PedidosQueries {
  async listar({ estado, desde, hasta }: FiltrosPedidos) {
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
      `SELECT ${COLUMNAS},
              (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT 500`,
      params,
    )
    return rows.map(aResumen)
  }

  async detalle(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
      [id],
    )
    if (!rows[0]) return null
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT i.producto_id, pr.nombre, i.cantidad, i.precio_unitario
       FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id
       WHERE i.pedido_id = ? ORDER BY i.id`,
      [id],
    )
    const { unidades: _, ...pedido } = aResumen(rows[0])
    return {
      ...pedido,
      items: items.map((i) => ({
        productoId: i.producto_id as number,
        nombre: i.nombre as string,
        cantidad: Number(i.cantidad),
        precioUnitario: Number(i.precio_unitario),
      })),
    }
  }
}
