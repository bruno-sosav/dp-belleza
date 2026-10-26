/** Link de wa.me a una clienta. El teléfono ya viene normalizado de la base (549 + 10 dígitos). */
export function whatsappCliente(telefono: string, mensaje?: string) {
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""
  return `https://wa.me/${telefono}${texto}`
}
