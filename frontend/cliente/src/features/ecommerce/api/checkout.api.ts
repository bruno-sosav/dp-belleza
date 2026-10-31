/** Checkout: lo que se manda a `POST /api/tienda/pedidos` (checkout.controller.ts) y lo que vuelve. */
import { api, ApiError } from "../../../shared/lib/api"

export type NuevoPedido = {
  cliente: { nombre: string; apellido?: string; telefono: string; email?: string }
  items: { productoId: number; cantidad: number }[]
  notas?: string
}

type LineaDePedido = { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }

export type PedidoCreado = {
  id: number
  estado: "pendiente"
  /** Con los precios de la base: es lo que se cobra. */
  total: number
  items: LineaDePedido[]
  /** Con Mercado Pago conectado, para ir a pagar y volver. null = el pago se coordina por WhatsApp. */
  pagoToken: string | null
}

/** Cómo quedó un pedido al volver de Mercado Pago (GET /api/tienda/pedidos/pago/:token). */
export type PedidoPagable = {
  id: number
  estado: "pendiente" | "confirmado" | "entregado" | "cancelado"
  pagoEstado: "pendiente" | "pagado" | null
  total: number
  items: LineaDePedido[]
}

/** Un producto que no se pudo comprar (409): dado de baja o sin stock suficiente. */
export type ProblemaDeCompra = { productoId: number; motivo: string }

export function crearPedido(pedido: NuevoPedido) {
  return api<PedidoCreado>("/api/tienda/pedidos", { method: "POST", body: pedido })
}

/** El link de Mercado Pago para pagar el pedido (o reintentar). */
export function linkDePago(token: string) {
  return api<{ link: string }>(`/api/tienda/pedidos/pago/${token}/pagar`, { method: "POST" })
}

/** `pagoId` es el payment_id que agrega Mercado Pago a la URL: con eso el backend confirma el pago sin esperar el aviso. */
export function consultarPago(token: string, pagoId: string | null) {
  return api<PedidoPagable>(`/api/tienda/pedidos/pago/${token}`, { query: pagoId ? { payment_id: pagoId } : {} })
}

/** Si el backend rechazó la compra por stock o disponibilidad, qué productos fallaron. Si no, null. */
export function problemasDeCompra(err: unknown): ProblemaDeCompra[] | null {
  if (!(err instanceof ApiError) || err.status !== 409 || !Array.isArray(err.detalle)) return null
  return err.detalle as ProblemaDeCompra[]
}
