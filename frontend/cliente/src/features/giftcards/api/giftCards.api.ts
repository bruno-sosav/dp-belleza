/** Gift cards en la web: /api/tienda/gift-cards (giftCards.controller.ts). */
import { api } from "../../../shared/lib/api"

export const MONTOS_SUGERIDOS = [10000, 20000, 30000, 50000]
export const MONTO_MINIMO = 5000
export const MONTO_MAXIMO = 500000

export type CompraGiftCard = {
  monto: number
  comprador: { nombre: string; telefono: string; email?: string }
  para?: string
  mensaje?: string
}

/** Cómo quedó al volver de Mercado Pago. `codigo` llega recién cuando está pagada. */
export type GiftCardComprada = {
  estado: "pendiente_pago" | "activa" | "anulada"
  monto: number
  para: string | null
  mensaje: string | null
  codigo: string | null
}

export type SaldoGiftCard = { codigo: string; saldo: number }

/** Queda esperando el pago: con el token se pide el link de Mercado Pago. */
export function comprarGiftCard(compra: CompraGiftCard) {
  return api<{ pagoToken: string }>("/api/tienda/gift-cards", { method: "POST", body: compra })
}

export function linkDePagoGiftCard(token: string) {
  return api<{ link: string }>(`/api/tienda/gift-cards/pago/${token}/pagar`, { method: "POST" })
}

/** `pagoId`: el payment_id que agrega Mercado Pago a la URL, para confirmar sin esperar el aviso. */
export function consultarGiftCard(token: string, pagoId: string | null) {
  return api<GiftCardComprada>(`/api/tienda/gift-cards/pago/${token}`, { query: pagoId ? { payment_id: pagoId } : {} })
}

export function consultarSaldo(codigo: string) {
  return api<SaldoGiftCard>("/api/tienda/gift-cards/saldo", { query: { codigo } })
}
