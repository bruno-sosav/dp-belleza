/**
 * Integración con Mercado Pago (API REST, sin SDK: son tres llamadas).
 *
 * La cuenta del local se configura desde Ajustes del panel
 * (admin/mercadopago.ts) y queda en `mercadopago_cuenta`, con el access token
 * cifrado. Este módulo es lo que usa el resto del backend para cobrar:
 *
 *   crearPreferencia()  arma un link de pago (Checkout Pro). La tienda lo usa
 *                       al confirmar un pedido: referenciaExterna "pedido-15".
 *   consultarPago()     trae un pago por id (lo usa el webhook).
 *   firmaValida()       verifica que una notificación venga de Mercado Pago.
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/reference
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import { pool } from "../core/database/conexion.js"
import { descifrar } from "../core/seguridad/cifrado.js"
import { HttpError } from "../core/errores.js"

const API = "https://api.mercadopago.com"

export type CuentaMP = {
  accessToken: string
  publicKey: string
  webhookSecret: string | null
  modo: "prueba" | "produccion"
}

/** La cuenta configurada, o null si todavía no se cargaron las credenciales. */
export async function cuentaMercadoPago(): Promise<CuentaMP | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM mercadopago_cuenta WHERE id = 1")
  const r = rows[0]
  if (!r) return null
  return {
    accessToken: descifrar(r.access_token_cifrado),
    publicKey: r.public_key,
    webhookSecret: r.webhook_secret_cifrado ? descifrar(r.webhook_secret_cifrado) : null,
    modo: r.modo,
  }
}

/** Llamada a la API con un token dado. Los errores de Mercado Pago llegan como HttpError con un mensaje entendible. */
export async function llamarMP<T>(token: string, ruta: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${API}${ruta}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new HttpError(502, "No se pudo conectar con Mercado Pago. Probá de nuevo en un rato.")
  }
  const datos = await respuesta.json().catch(() => null)
  if (respuesta.status === 401 || respuesta.status === 403) {
    throw new HttpError(400, "Mercado Pago rechazó las credenciales. Revisá que el Access Token esté bien copiado.")
  }
  if (!respuesta.ok) {
    throw new HttpError(502, `Mercado Pago respondió con un error (${respuesta.status}${datos?.message ? `: ${datos.message}` : ""}).`)
  }
  return datos as T
}

async function tokenConfigurado(): Promise<string> {
  const cuenta = await cuentaMercadoPago()
  if (!cuenta) throw new HttpError(409, "Mercado Pago no está configurado. Cargá las credenciales en Ajustes → Mercado Pago.")
  return cuenta.accessToken
}

export type UsuarioMP = { id: number; nickname: string; email?: string; site_id: string }

/** A qué cuenta pertenece un token. Sirve para validar credenciales antes de guardarlas. */
export function usuarioDelToken(token: string) {
  return llamarMP<UsuarioMP>(token, "/users/me")
}

export type ItemCobro = { titulo: string; cantidad: number; precioUnitario: number }

/**
 * Crea un link de pago (Checkout Pro). Devuelve el link para mandar a la
 * clienta: `init_point` en producción, `sandbox_init_point` con credenciales de
 * prueba.
 */
export async function crearPreferencia(datos: {
  items: ItemCobro[]
  /** Con esto el webhook sabe qué se pagó, ej. "pedido-15". */
  referenciaExterna: string
  /** A dónde vuelve la clienta después de pagar. */
  urlsDeVuelta?: { exito: string; pendiente: string; error: string }
  /** URL pública de /api/mercadopago/webhook (en local no existe; ver README). */
  urlNotificacion?: string
}): Promise<{ id: string; link: string }> {
  const cuenta = await cuentaMercadoPago()
  if (!cuenta) throw new HttpError(409, "Mercado Pago no está configurado. Cargá las credenciales en Ajustes → Mercado Pago.")
  const pref = await llamarMP<{ id: string; init_point: string; sandbox_init_point: string }>(cuenta.accessToken, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: datos.items.map((i) => ({ title: i.titulo, quantity: i.cantidad, unit_price: i.precioUnitario, currency_id: "ARS" })),
      external_reference: datos.referenciaExterna,
      ...(datos.urlsDeVuelta
        ? {
            back_urls: { success: datos.urlsDeVuelta.exito, pending: datos.urlsDeVuelta.pendiente, failure: datos.urlsDeVuelta.error },
            // Mercado Pago solo vuelve solo a la web si la dirección es https;
            // en local (http://localhost) la clienta toca "Volver al sitio".
            ...(datos.urlsDeVuelta.exito.startsWith("https://") ? { auto_return: "approved" } : {}),
          }
        : {}),
      ...(datos.urlNotificacion ? { notification_url: datos.urlNotificacion } : {}),
    }),
  })
  return { id: pref.id, link: cuenta.modo === "prueba" ? pref.sandbox_init_point : pref.init_point }
}

export type PagoMP = {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  external_reference: string | null
}

export async function consultarPago(id: string | number): Promise<PagoMP> {
  return llamarMP<PagoMP>(await tokenConfigurado(), `/v1/payments/${id}`)
}

/**
 * Verifica la firma de una notificación (header x-signature: "ts=...,v1=...").
 * Mercado Pago firma con HMAC-SHA256 el texto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * usando la "clave secreta" del webhook que se copia de su panel.
 */
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
