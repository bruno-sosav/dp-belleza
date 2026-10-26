/** Horarios de la agenda y huecos libres (ya descuentan turnos, bloqueos y horas pasadas) + helpers de fechas. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type TimeSlot = {
  /** Formato HH:MM en 24hs. */
  time: string
  available: boolean
}

/** Una franja de atención. Los días que no aparecen, el local está cerrado. */
export type OpeningHours = {
  /** 1 = lunes ... 7 = domingo (ISO 8601, NO la convención de JavaScript). */
  diaSemana: number
  desde: string
  hasta: string
}

export const weekDayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

/** Clave YYYY-MM-DD en horario local, sin pasar por UTC. */
export function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** "2026-09-22" → Date local, sin corrimiento por zona horaria. */
export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function isSameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b)
}

export function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

export function isPast(date: Date) {
  return date.getTime() < startOfToday().getTime()
}

/** getDay() de JavaScript (0 = domingo) → ISO (7 = domingo). */
const isoWeekDay = (date: Date) => date.getDay() || 7

export function isOpen(date: Date, hours: OpeningHours[]) {
  return hours.some((h) => h.diaSemana === isoWeekDay(date))
}

/** Franja horaria, para agrupar la grilla de horarios. */
export function slotPeriod(time: string) {
  const hour = Number(time.slice(0, 2))
  if (hour < 13) return "Mañana"
  if (hour < 18) return "Tarde"
  return "Noche"
}

// ---------------------------------------------------------------- textos

/** ISO 1..7 → "Lun".."Dom" */
const isoLabel = (dia: number) => weekDayLabels[dia % 7]

/** "09:00" → "9" · "09:30" → "9:30" */
const shortHour = (hhmm: string) => {
  const [h, m] = hhmm.split(":")
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`
}

/** Días que atiende, juntando los consecutivos: "Lun a Sáb", "Lun, Mié y Vie". */
export function describeOpenDays(hours: OpeningHours[]) {
  const days = [...new Set(hours.map((h) => h.diaSemana))].sort((a, b) => a - b)
  if (days.length === 0) return "Cerrado"
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  if (contiguous && days.length > 2) return `${isoLabel(days[0])} a ${isoLabel(days[days.length - 1])}`
  const labels = days.map(isoLabel)
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`
}

/** Horario en una línea agrupando días iguales: "Lun a Mié 9 a 19 hs · Dom cerrado". */
export function describeOpeningHours(hours: OpeningHours[]) {
  const byDay = new Map<number, string>()
  for (const h of hours) {
    const range = `${shortHour(h.desde)} a ${shortHour(h.hasta)}`
    byDay.set(h.diaSemana, byDay.has(h.diaSemana) ? `${byDay.get(h.diaSemana)} y ${range}` : range)
  }

  const groups: { from: number; to: number; text: string }[] = []
  for (let day = 1; day <= 7; day++) {
    const text = byDay.get(day) ?? "cerrado"
    const last = groups[groups.length - 1]
    if (last && last.text === text && last.to === day - 1) last.to = day
    else groups.push({ from: day, to: day, text })
  }

  return groups
    .map(({ from, to, text }) => {
      const days =
        from === to
          ? isoLabel(from)
          : to === from + 1
            ? `${isoLabel(from)} y ${isoLabel(to)}`
            : `${isoLabel(from)} a ${isoLabel(to)}`
      return text === "cerrado" ? `${days} cerrado` : `${days} ${text} hs`
    })
    .join(" · ")
}

// ---------------------------------------------------------------- API

const fetchOpeningHours = () => api<OpeningHours[]>("/api/turnos/horarios")

/** Agenda semanal del local. */
export function useOpeningHours() {
  return useApi(fetchOpeningHours)
}

/** Horarios de un servicio en un día. Sin día elegido, no pide nada. */
export function useSlots(serviceId: number | undefined, date: Date | null) {
  const dateKey = date ? toDateKey(date) : null
  const request = useCallback(
    () =>
      serviceId && dateKey
        ? api<TimeSlot[]>("/api/turnos/disponibilidad", { query: { servicioId: serviceId, fecha: dateKey } })
        : Promise.resolve([]),
    [serviceId, dateKey],
  )
  return useApi(request)
}
