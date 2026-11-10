/** Pedidos de la tienda en el panel: /api/admin/pedidos (pedidos.controller.ts). Las transiciones las valida el backend. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type EstadoPedido = "pendiente" | "confirmado" | "entregado" | "cancelado"

/** null = el pago se coordina por WhatsApp; "pendiente" = esperando el pago de Mercado Pago. */
export type PagoEstado = "pendiente" | "pagado" | null

/** Retira en el local o se lo mandan por Andreani (o el simulador del modo prueba). */
export type Entrega = "retiro" | "envio"
export type EstadoEnvio = "a_despachar" | "despachado" | "entregado"

export type Envio = {
  calle: string
  ciudad: string
  provincia: string
  codigoPostal: string
  /** Lo que pagó la clienta (0 = gratis). */
  costo: number
  plazoDias: number | null
  proveedor: "andreani" | "prueba"
  estado: EstadoEnvio
  numeroSeguimiento: string | null
  despachadoAt: string | null
}

export type EventoDeSeguimiento = { fecha: string; estado: string; detalle: string | null }

type ClientePedido = { id: number; nombre: string; apellido: string | null; telefono: string; email: string | null }

export type PedidoResumen = {
  id: number
  estado: EstadoPedido
  pagoEstado: PagoEstado
  total: number
  notas: string | null
  unidades: number
  entrega: Entrega
  envioEstado: EstadoEnvio | null
  cliente: ClientePedido
  /** "2026-10-15 10:32:00" */
  creadoEn: string
  actualizadoEn: string
}

export type PedidoDetalle = Omit<PedidoResumen, "unidades" | "envioEstado"> & {
  items: { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  envio: Envio | null
  /** La gift card con que pagó todo o una parte. */
  giftCard: { codigo: string; monto: number } | null
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

/** Para Hoy: pendientes y confirmados (los que faltan entregar), del más viejo al más nuevo. */
export function usePedidosPendientes() {
  const pedir = useCallback(async () => {
    const [pendientes, confirmados] = await Promise.all([
      api<PedidoResumen[]>("/api/admin/pedidos", { query: { estado: "pendiente" } }),
      api<PedidoResumen[]>("/api/admin/pedidos", { query: { estado: "confirmado" } }),
    ])
    return [...pendientes, ...confirmados].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  }, [])
  return useApi(pedir)
}

/** Genera el envío con Andreani (o el simulador). Solo con el pedido confirmado. */
export function despacharEnvio(id: number) {
  return api<PedidoDetalle>(`/api/admin/pedidos/${id}/envio/despachar`, { metodo: "POST" })
}

/** El seguimiento del paquete. `pedir` false: todavía no se pidió (se carga al abrirlo). */
export function useSeguimiento(id: number, pedir: boolean) {
  const consultar = useCallback(() => (pedir ? api<EventoDeSeguimiento[]>(`/api/admin/pedidos/${id}/envio/seguimiento`) : Promise.resolve(null)), [id, pedir])
  return useApi(consultar)
}
