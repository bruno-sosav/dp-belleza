import { fromDateKey } from "../data/history"

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
