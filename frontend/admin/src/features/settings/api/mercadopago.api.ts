/**
 * Mercado Pago en Ajustes: /api/admin/mercadopago.
 *
 * Las credenciales nunca vuelven enteras: solo si está conectado, la cuenta,
 * el modo y los últimos 4 caracteres del token.
 */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type EstadoMercadoPago =
  | { configurada: false }
  | {
      configurada: true
      modo: "prueba" | "produccion"
      cuenta: string | null
      publicKey: string
      tokenFinal: string
      webhookSecretCargado: boolean
      /** "2026-10-17 12:30" */
      verificadaAt: string | null
    }

export function useMercadoPago() {
  const pedir = useCallback(() => api<EstadoMercadoPago>("/api/admin/mercadopago"), [])
  return useApi(pedir)
}

export function guardarCredenciales(datos: { accessToken: string; publicKey: string; webhookSecret?: string }) {
  return api<EstadoMercadoPago>("/api/admin/mercadopago", { metodo: "PUT", cuerpo: datos })
}

export function probarConexion() {
  return api<EstadoMercadoPago>("/api/admin/mercadopago/probar", { metodo: "POST" })
}

export function desconectar() {
  return api<void>("/api/admin/mercadopago", { metodo: "DELETE" })
}
