export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * "5492235550001" → "223 555-0001" · "5491112345678" → "11 1234-5678".
 *
 * Los teléfonos vienen normalizados de la base (549 + 10 dígitos). Para
 * mostrarlos se saca el 549 y se separa el código de área: 2 dígitos para
 * Buenos Aires (11), 3 para el resto, que es el caso de Mar del Plata (223).
 * Las áreas de 4 dígitos se ven con un corte distinto, pero los números son los
 * mismos. Cualquier otro formato se muestra tal cual.
 */
export function formatTelefono(telefono: string) {
  if (!/^549\d{10}$/.test(telefono)) return telefono
  const nacional = telefono.slice(3)
  const area = nacional.startsWith("11") ? 2 : 3
  const resto = nacional.slice(area)
  return `${nacional.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`
}
