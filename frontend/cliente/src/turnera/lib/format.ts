import { monthLabels } from "../data/availability"

/** 60 → "1 h" · 75 → "1 h 15 min" · 45 → "45 min" */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** 2026-09-22 → "lunes 22 de septiembre" */
export function formatLongDate(date: Date) {
  const weekDays = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
  const month = monthLabels[date.getMonth()].toLowerCase()
  return `${weekDays[date.getDay()]} ${date.getDate()} de ${month}`
}

/** "14:30" → "14:30 hs" */
export function formatTime(time: string) {
  return `${time} hs`
}
