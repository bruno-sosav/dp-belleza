/**
 * Link para abrir un chat de WhatsApp con una clienta.
 *
 * Los teléfonos ya vienen normalizados de la base (549 + 10 dígitos, ver
 * backend/src/modules/customers/models/telefono.model.ts), que es justo el formato que pide wa.me.
 */
export function whatsappCliente(telefono: string, mensaje?: string) {
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""
  return `https://wa.me/${telefono}${texto}`
}
