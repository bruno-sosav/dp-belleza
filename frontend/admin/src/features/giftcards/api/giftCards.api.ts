/** Gift cards en el panel: /api/admin/gift-cards (giftCards.controller.ts). */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import type { MedioPago } from "../../payments/lib/medios"

export type EstadoGiftCard = "pendiente_pago" | "activa" | "anulada"

export type GiftCard = {
  id: number
  /** "AB3K-XY7Q" */
  codigo: string
  monto: number
  saldo: number
  estado: EstadoGiftCard
  origen: "web" | "local"
  comprador: { nombre: string; telefono: string | null; email: string | null }
  para: string | null
  mensaje: string | null
  activadaAt: string | null
  creadaEn: string
}

export type Movimiento = {
  id: number
  fechaHora: string
  tipo: "carga" | "uso" | "reintegro" | "anulacion"
  monto: number
  saldoDespues: number
  pedidoId: number | null
  descripcion: string | null
}

export type GiftCardDetalle = GiftCard & { movimientos: Movimiento[] }

export type VentaEnElLocal = {
  monto: number
  medio: Exclude<MedioPago, "gift_card">
  comprador: { nombre: string; telefono?: string }
  para?: string
  mensaje?: string
}

export function useGiftCards(filtros: { estado?: EstadoGiftCard; q?: string }) {
  const { estado, q } = filtros
  const pedir = useCallback(() => api<GiftCard[]>("/api/admin/gift-cards", { query: { ...(estado ? { estado } : {}), ...(q ? { q } : {}) } }), [estado, q])
  return useApi(pedir)
}

export function verGiftCard(id: number) {
  return api<GiftCardDetalle>(`/api/admin/gift-cards/${id}`)
}

export function venderGiftCard(venta: VentaEnElLocal) {
  return api<GiftCard>("/api/admin/gift-cards", { metodo: "POST", cuerpo: venta })
}

export function anularGiftCard(id: number) {
  return api<GiftCardDetalle>(`/api/admin/gift-cards/${id}/anular`, { metodo: "POST" })
}
