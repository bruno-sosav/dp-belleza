export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

/** "5492235550001" → "223 555-0001". Saca el 549 y corta el área (2 dígitos si es 11, si no 3). */
export function formatTelefono(telefono: string) {
  if (!/^549\d{10}$/.test(telefono)) return telefono
  const nacional = telefono.slice(3)
  const area = nacional.startsWith("11") ? 2 : 3
  const resto = nacional.slice(area)
  return `${nacional.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`
}
