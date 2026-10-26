/** API REST de Mercado Pago sin SDK. https://www.mercadopago.com.ar/developers/es/reference */
import { externo, invalido } from "../../../core/negocio.error.js"
import type { CuentaMercadoPago, PagoRecibido } from "../models/mercadoPago.model.js"
import type { PasarelaDePago } from "../models/pagos.ports.js"

const API = "https://api.mercadopago.com"

/** Una llamada con un token dado. Los errores de Mercado Pago salen con un mensaje entendible. */
async function llamar<T>(token: string, ruta: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${API}${ruta}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw externo("No se pudo conectar con Mercado Pago. Probá de nuevo en un rato.")
  }
  const datos = await respuesta.json().catch(() => null)
  if (respuesta.status === 401 || respuesta.status === 403) {
    throw invalido("Mercado Pago rechazó las credenciales. Revisá que el Access Token esté bien copiado.")
  }
  if (!respuesta.ok) {
    throw externo(`Mercado Pago respondió con un error (${respuesta.status}${datos?.message ? `: ${datos.message}` : ""}).`)
  }
  return datos as T
}

type PagoMP = { id: number; status: string; status_detail: string; transaction_amount: number; external_reference: string | null }

/** Un pago de Mercado Pago en los términos del dominio. */
export const aPagoRecibido = (p: PagoMP): PagoRecibido => ({
  id: Number(p.id),
  estado: p.status,
  detalle: p.status_detail,
  aprobado: p.status === "approved",
  monto: Number(p.transaction_amount),
  referencia: p.external_reference ?? null,
})

export class MercadoPagoApi implements PasarelaDePago {
  async usuario(accessToken: string) {
    const u = await llamar<{ nickname: string; email?: string }>(accessToken, "/users/me")
    return { nickname: u.nickname, email: u.email ?? null }
  }

  /** Checkout Pro: `init_point` en producción, `sandbox_init_point` con credenciales de prueba. */
  async crearLink(cuenta: CuentaMercadoPago, d: Parameters<PasarelaDePago["crearLink"]>[1]) {
    const pref = await llamar<{ init_point: string; sandbox_init_point: string }>(cuenta.accessToken, "/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: d.items.map((i) => ({ title: i.titulo, quantity: i.cantidad, unit_price: i.precioUnitario, currency_id: "ARS" })),
        external_reference: d.referencia,
        ...(d.vuelta
          ? {
              back_urls: { success: d.vuelta.exito, pending: d.vuelta.pendiente, failure: d.vuelta.error },
              // Mercado Pago solo vuelve solo a la web si la dirección es https;
              // en local (http://localhost) la clienta toca "Volver al sitio".
              ...(d.vuelta.exito.startsWith("https://") ? { auto_return: "approved" } : {}),
            }
          : {}),
        ...(d.notificacion ? { notification_url: d.notificacion } : {}),
      }),
    })
    return cuenta.modo === "prueba" ? pref.sandbox_init_point : pref.init_point
  }

  async consultarPago(cuenta: CuentaMercadoPago, id: string | number) {
    const datos = await llamar<PagoMP>(cuenta.accessToken, `/v1/payments/${id}`)
    return { pago: aPagoRecibido(datos), datos }
  }
}
