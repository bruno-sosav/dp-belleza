/** Lo que SALE por HTTP de orders. Misma forma que tenía la API antes de pasar a módulos. */
import { subtotal, type LineaConPrecio, type Pedido, type PedidoResumen } from "../models/pedido.model.js"
import type { PedidoCreado } from "../services/checkout.usecases.js"

const aLinea = (l: LineaConPrecio) => ({
  productoId: l.productoId,
  nombre: l.nombre,
  cantidad: l.cantidad,
  precioUnitario: l.precioUnitario,
  subtotal: subtotal(l),
})

/** La respuesta del checkout: lo justo para mostrarle a la clienta su compra. */
export const aPedidoCreado = (p: PedidoCreado) => ({ id: p.id, estado: p.estado, total: p.total, items: p.items.map(aLinea) })

/** Un pedido en la lista del panel. */
export const aPedidoResumen = (p: PedidoResumen) => ({
  id: p.id,
  estado: p.estado,
  total: p.total,
  notas: p.notas,
  unidades: p.unidades,
  cliente: p.cliente,
  creadoEn: p.creadoEn,
  actualizadoEn: p.actualizadoEn,
})

/** Un pedido con sus líneas (detalle del panel). */
export const aPedidoDetalle = (p: Pedido) => ({
  id: p.id,
  estado: p.estado,
  total: p.total,
  notas: p.notas,
  cliente: p.cliente,
  creadoEn: p.creadoEn,
  actualizadoEn: p.actualizadoEn,
  items: p.items.map(aLinea),
})
