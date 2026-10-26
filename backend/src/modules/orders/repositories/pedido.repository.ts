/** `pedidos` y `pedido_items` en MySQL. Solo escrituras y lo que necesitan para cambiar un estado. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { PedidoRepository } from "../models/pedidos.ports.js"
import type { EstadoPedido, NuevoPedido } from "../models/pedido.model.js"

export class MySqlPedidoRepository implements PedidoRepository {
  async crear(p: NuevoPedido, tx: Transaccion) {
    const db = ejecutor(tx)
    const [r] = await db.query<ResultSetHeader>("INSERT INTO pedidos (cliente_id, total, notas) VALUES (?, ?, ?)", [
      p.clienteId,
      p.total,
      p.notas,
    ])
    await db.query("INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?", [
      p.lineas.map((l) => [r.insertId, l.productoId, l.cantidad, l.precioUnitario]),
    ])
    return r.insertId
  }

  async estadoParaCambiar(id: number, tx: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT estado FROM pedidos WHERE id = ? FOR UPDATE", [id])
    return (rows[0]?.estado as EstadoPedido | undefined) ?? null
  }

  async cambiarEstado(id: number, estado: EstadoPedido, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id])
  }

  async lineas(id: number, tx: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?", [id])
    return rows.map((r) => ({ productoId: r.producto_id as number, cantidad: Number(r.cantidad) }))
  }
}
