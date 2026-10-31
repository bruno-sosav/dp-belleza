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

/** La respuesta del checkout: lo justo para mostrarle a la clienta su compra. `pagoToken` null = sin Mercado Pago. */
export const aPedidoCreado = (p: PedidoCreado) => ({ id: p.id, estado: p.estado, total: p.total, items: p.items.map(aLinea), pagoToken: p.pagoToken })

/** El pedido como lo ve la clienta al volver de Mercado Pago: sin datos de la clienta. */
export const aPedidoPublico = (p: Pedido) => ({ id: p.id, estado: p.estado, pagoEstado: p.pagoEstado, total: p.total, items: p.items.map(aLinea) })

export const aLinkDePago = (link: string) => ({ link })

/** Un pedido en la lista del panel. */
export const aPedidoResumen = (p: PedidoResumen) => ({
  id: p.id,
  estado: p.estado,
  pagoEstado: p.pagoEstado,
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
  pagoEstado: p.pagoEstado,
  total: p.total,
  notas: p.notas,
  cliente: p.cliente,
  creadoEn: p.creadoEn,
  actualizadoEn: p.actualizadoEn,
  items: p.items.map(aLinea),
})
