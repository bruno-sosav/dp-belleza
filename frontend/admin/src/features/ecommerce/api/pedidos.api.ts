/** Pedidos de la tienda en el panel: /api/admin/pedidos (pedidos.controller.ts). Las transiciones las valida el backend. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type EstadoPedido = "pendiente" | "confirmado" | "entregado" | "cancelado"

/** null = el pago se coordina por WhatsApp; "pendiente" = esperando el pago de Mercado Pago. */
export type PagoEstado = "pendiente" | "pagado" | null

type ClientePedido = { id: number; nombre: string; apellido: string | null; telefono: string; email: string | null }

export type PedidoResumen = {
  id: number
  estado: EstadoPedido
  pagoEstado: PagoEstado
  total: number
  notas: string | null
  unidades: number
  cliente: ClientePedido
  /** "2026-10-15 10:32:00" */
  creadoEn: string
  actualizadoEn: string
}

export type PedidoDetalle = Omit<PedidoResumen, "unidades"> & {
  items: { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
}

/** A qué estados se puede pasar desde cada uno (el backend lo vuelve a validar). */
export const siguientes: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
}

export const nombreCliente = (c: Pick<ClientePedido, "nombre" | "apellido">) => [c.nombre, c.apellido].filter(Boolean).join(" ")

/** Los últimos 500 pedidos: los filtros por estado y la búsqueda se hacen en la pantalla. */
export function usePedidos() {
  const pedir = useCallback(() => api<PedidoResumen[]>("/api/admin/pedidos"), [])
  return useApi(pedir)
}

export function usePedido(id: number) {
  const pedir = useCallback(() => api<PedidoDetalle>(`/api/admin/pedidos/${id}`), [id])
  return useApi(pedir)
}

export function cambiarEstadoPedido(id: number, estado: EstadoPedido) {
  return api<PedidoDetalle>(`/api/admin/pedidos/${id}/estado`, { metodo: "PATCH", cuerpo: { estado } })
}
