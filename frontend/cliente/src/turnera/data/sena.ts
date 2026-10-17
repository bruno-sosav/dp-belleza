/**
 * Seña con Mercado Pago: lo que ve la clienta cuando vuelve de pagar
 * (/reserva/pago?t=<token>). El token es aleatorio y viaja en la URL de vuelta.
 */
import { api } from "../lib/api"

export type EstadoSena = {
  /** "DP-000123" */
  codigo: string
  estado: "reservado" | "confirmado" | "completado" | "ausente" | "cancelado"
  sena: { monto: number; estado: "pendiente" | "pagada" | "vencida" }
  servicio: string
  fecha: string
  hora: string
  precio: number
  /** "2026-10-17 12:30", si todavía puede pagar. */
  venceA: string | null
}

/** `pagoId` es el payment_id que agrega Mercado Pago a la URL: con eso el backend confirma el pago. */
export function consultarSena(token: string, pagoId: string | null) {
  return api<EstadoSena>(`/api/turnos/sena/${token}`, { query: pagoId ? { payment_id: pagoId } : {} })
}

export function nuevoLinkDePago(token: string) {
  return api<{ link: string }>(`/api/turnos/sena/${token}/pagar`, { method: "POST" })
}
