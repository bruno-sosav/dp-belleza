/** Checkout: lo que se manda a `POST /api/tienda/pedidos` (checkout.controller.ts) y lo que vuelve. */
import { api, ApiError } from "../../../shared/lib/api"

export type NuevoPedido = {
  cliente: { nombre: string; apellido?: string; telefono: string; email?: string }
  items: { productoId: number; cantidad: number }[]
  notas?: string
}

export type PedidoCreado = {
  id: number
  estado: "pendiente"
  /** Con los precios de la base: es lo que se cobra. */
  total: number
  items: { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
}

/** Un producto que no se pudo comprar (409): dado de baja o sin stock suficiente. */
export type ProblemaDeCompra = { productoId: number; motivo: string }

export function crearPedido(pedido: NuevoPedido) {
  return api<PedidoCreado>("/api/tienda/pedidos", { method: "POST", body: pedido })
}

/** Si el backend rechazó la compra por stock o disponibilidad, qué productos fallaron. Si no, null. */
export function problemasDeCompra(err: unknown): ProblemaDeCompra[] | null {
  if (!(err instanceof ApiError) || err.status !== 409 || !Array.isArray(err.detalle)) return null
  return err.detalle as ProblemaDeCompra[]
}
