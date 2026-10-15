import { fromDateKey } from "./fechas"

export const weekdayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const weekdayLong = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const monthShort = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const monthLong = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

const compactMoney = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
})

/** 1250000 → "$ 1,3 M" · 450000 → "$ 450 mil" (para ejes y tarjetas chicas). */
export function formatCompactPrice(value: number) {
  return compactMoney.format(value)
}

/** "2026-09-22" → "lun 22/09" */
export function formatShortDate(key: string) {
  const d = fromDateKey(key)
  return `${weekdayShort[d.getDay()].toLowerCase()} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** "2026-09-22" → "22 sep" */
export function formatDayMonth(key: string) {
  const d = fromDateKey(key)
  return `${d.getDate()} ${monthShort[d.getMonth()]}`
}

/** "2026-09-22" → "lunes 22 de septiembre" */
export function formatLongDate(key: string) {
  const d = fromDateKey(key)
  return `${weekdayLong[d.getDay()]} ${d.getDate()} de ${monthLong[d.getMonth()]}`
}

export function monthShortName(monthIndex: number) {
  return monthShort[monthIndex]
}

export function weekdayName(weekday: number) {
  return weekdayLong[weekday]
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

/** "13 al 19 de octubre" · "29 de septiembre al 5 de octubre" (cuando la semana cruza de mes). */
export function formatRangoSemana(desde: string, hasta: string) {
  const a = fromDateKey(desde)
  const b = fromDateKey(hasta)
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} al ${b.getDate()} de ${monthLong[b.getMonth()]}`
  return `${a.getDate()} de ${monthLong[a.getMonth()]} al ${b.getDate()} de ${monthLong[b.getMonth()]}`
}
