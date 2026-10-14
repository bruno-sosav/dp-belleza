/**
 * Número de WhatsApp al que llegan los mensajes del formulario de contacto.
 *
 * Formato internacional, solo dígitos, sin "+", espacios ni guiones.
 * Argentina (celular): 54 + 9 + código de área sin 0 + número sin 15.
 *   Ej: 11 1234-5678  →  5491112345678
 *
 * TODO: reemplazar por el número real del local.
 */
export const WHATSAPP_NUMBER = "5491112345678"

/** Arma el link de WhatsApp que abre el chat con el mensaje ya escrito. */
export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
