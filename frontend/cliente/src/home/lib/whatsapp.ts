/**
 * Link de WhatsApp que abre el chat con el mensaje ya escrito.
 *
 * El número es el del local, que la dueña carga en Ajustes del panel (ver
 * shared/lib/negocio.ts). Viene normalizado: 549 + código de área + número,
 * que es el formato que pide wa.me.
 */
export function whatsappUrl(telefono: string, message: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(message)}`
}
