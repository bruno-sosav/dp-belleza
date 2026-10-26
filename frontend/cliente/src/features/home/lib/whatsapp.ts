/** Link de wa.me al local con el mensaje escrito. El número viene normalizado (ver shared/lib/negocio.ts). */
export function whatsappUrl(telefono: string, message: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(message)}`
}
