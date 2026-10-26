/** Reglas de la cuenta de Mercado Pago y de los pagos. La API está detrás de PasarelaDePago. */
import { createHmac, timingSafeEqual } from "node:crypto"

export type ModoCuenta = "prueba" | "produccion"

export type CuentaMercadoPago = {
  accessToken: string
  publicKey: string
  webhookSecret: string | null
  modo: ModoCuenta
}

/** Lo que el panel puede ver de la cuenta: nunca las credenciales enteras. */
export type ResumenCuenta = {
  modo: ModoCuenta
  cuenta: string | null
  publicKey: string
  tokenFinal: string
  webhookSecretCargado: boolean
  verificadaAt: string | null
}

/** Los dos de prueba o los dos de producción: mezclados, Mercado Pago rechaza los pagos. */
export function problemaDeCredenciales(accessToken: string, publicKey: string): string | null {
  if (accessToken.startsWith("TEST-") !== publicKey.startsWith("TEST-")) {
    return "El Access Token y la Public Key tienen que ser los dos de prueba o los dos de producción."
  }
  return null
}

/** Las credenciales de prueba empiezan con TEST- o son de un usuario de prueba (nickname TEST…). */
export function modoDeLaCuenta(accessToken: string, nickname: string): ModoCuenta {
  return accessToken.startsWith("TEST-") || /^TEST/i.test(nickname) ? "prueba" : "produccion"
}

/** Un pago como lo informa la pasarela, ya traducido. */
export type PagoRecibido = {
  id: number
  /** El estado de Mercado Pago: "approved", "pending", "rejected"… */
  estado: string
  detalle: string
  aprobado: boolean
  monto: number
  /** Qué se pagó: "turno-12" (seña), "pedido-15"… */
  referencia: string | null
}

/** "turno-12" → { tipo: "turno", id: 12 }. null si no es una referencia nuestra. */
export function destinoDelPago(referencia: string | null): { tipo: string; id: number } | null {
  const m = /^([a-z]+)-(\d+)$/.exec(referencia ?? "")
  return m ? { tipo: m[1], id: Number(m[2]) } : null
}

/** Firma del webhook (x-signature "ts=…,v1=…"): HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;". */
export function firmaValida(secreto: string, firma: string | undefined, requestId: string | undefined, dataId: string): boolean {
  if (!firma) return false
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=") as [string, string]))
  if (!partes.ts || !partes.v1) return false
  const manifiesto = `id:${dataId.toLowerCase()};${requestId ? `request-id:${requestId};` : ""}ts:${partes.ts};`
  const esperado = createHmac("sha256", secreto).update(manifiesto).digest("hex")
  const a = Buffer.from(esperado)
  const b = Buffer.from(partes.v1)
  return a.length === b.length && timingSafeEqual(a, b)
}
