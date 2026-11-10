/** `pedidos` y `pedido_items` en MySQL. Solo escrituras y lo que necesitan para cambiar un estado. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { PedidoRepository } from "../models/pedidos.ports.js"
import type { EstadoPedido, NuevoPedido, PagoEstado } from "../models/pedido.model.js"

export class MySqlPedidoRepository implements PedidoRepository {
  async crear(p: NuevoPedido, tx: Transaccion) {
    const db = ejecutor(tx)
    // Si la gift card cubre todo, ya está pagado: nace confirmado.
    const cubierto = !!p.giftCard && p.giftCard.monto + 0.001 >= p.total
    const [r] = await db.query<ResultSetHeader>(
      "INSERT INTO pedidos (cliente_id, estado, total, descuento_cumple, notas, pago_estado, pago_token, gift_card_id, gift_card_monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        p.clienteId,
        cubierto ? "confirmado" : "pendiente",
        p.total,
        p.descuentoCumple,
        p.notas,
        cubierto ? "pagado" : p.pago ? "pendiente" : null,
        p.pago?.token ?? null,
        p.giftCard?.id ?? null,
        p.giftCard?.monto ?? 0,
      ],
    )
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

  async paraPagar(id: number, tx?: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT id, cliente_id, estado, pago_estado, total, gift_card_monto FROM pedidos WHERE id = ? ${tx ? "FOR UPDATE" : ""}`,
      [id],
    )
    const r = rows[0]
    if (!r) return null
    return {
      id: r.id as number,
      clienteId: r.cliente_id as number,
      estado: r.estado as EstadoPedido,
      pagoEstado: (r.pago_estado as PagoEstado) ?? null,
      total: Number(r.total),
      giftCardMonto: Number(r.gift_card_monto ?? 0),
    }
  }

  async idPorToken(token: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT id FROM pedidos WHERE pago_token = ?", [token])
    return (rows[0]?.id as number | undefined) ?? null
  }

  async marcarPagado(id: number, pagoId: number, estado: EstadoPedido, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE pedidos SET pago_estado = 'pagado', pago_id = ?, estado = ? WHERE id = ?", [pagoId, estado, id])
  }

  async usoDescuentoCumple(clienteId: number, anio: number, tx: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT 1 FROM pedidos
        WHERE cliente_id = ? AND descuento_cumple > 0 AND estado <> 'cancelado'
          AND created_at >= ? AND created_at < ?
        LIMIT 1`,
      [clienteId, `${anio}-01-01`, `${anio + 1}-01-01`],
    )
    return rows.length > 0
  }

  async giftCardDelPedido(id: number, tx: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT gift_card_id, gift_card_monto FROM pedidos WHERE id = ? AND gift_card_id IS NOT NULL", [id])
    const r = rows[0]
    return r && Number(r.gift_card_monto) > 0 ? { id: r.gift_card_id as number, monto: Number(r.gift_card_monto) } : null
  }

  async lineas(id: number, tx: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?", [id])
    return rows.map((r) => ({ productoId: r.producto_id as number, cantidad: Number(r.cantidad) }))
  }
}
