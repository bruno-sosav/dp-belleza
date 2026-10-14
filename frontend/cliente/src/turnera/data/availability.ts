/**
 * MOCK DATA — Disponibilidad de turnos.
 *
 * Todo esto lo va a resolver el backend de turnera: los horarios reales salen
 * de la agenda de la profesional y de los turnos ya tomados. Acá solo generamos
 * slots de forma determinística para que la UI se vea real en la demo.
 */

export type TimeSlot = {
  /** Formato HH:MM en 24hs. */
  time: string
  available: boolean
}

/** Horario de atención por día de la semana (0 = domingo). */
const openingHours: Record<number, { from: number; to: number } | null> = {
  0: null,
  1: { from: 9, to: 19 },
  2: { from: 9, to: 19 },
  3: { from: 9, to: 19 },
  4: { from: 9, to: 20 },
  5: { from: 9, to: 20 },
  6: { from: 10, to: 15 },
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

export function isSameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b)
}

export function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/** La estética no atiende domingos. */
export function isClosed(date: Date) {
  return openingHours[date.getDay()] === null
}

export function isPast(date: Date) {
  return date.getTime() < startOfToday().getTime()
}

export function isSelectable(date: Date) {
  return !isPast(date) && !isClosed(date)
}

/** Hash simple y estable: el mismo día siempre muestra los mismos slots ocupados. */
function hash(input: string) {
  let value = 0
  for (let i = 0; i < input.length; i++) {
    value = (value * 31 + input.charCodeAt(i)) % 100000
  }
  return value
}

/**
 * Slots del día, espaciados según la duración del servicio.
 * Marca algunos como ocupados para que la grilla no se vea artificialmente vacía.
 */
export function getSlotsForDate(date: Date, durationMin: number): TimeSlot[] {
  const hours = openingHours[date.getDay()]
  if (!hours) return []

  const step = durationMin >= 60 ? 60 : 30
  const key = toDateKey(date)
  const slots: TimeSlot[] = []

  for (let minutes = hours.from * 60; minutes + durationMin <= hours.to * 60; minutes += step) {
    const hh = `${Math.floor(minutes / 60)}`.padStart(2, "0")
    const mm = `${minutes % 60}`.padStart(2, "0")
    const time = `${hh}:${mm}`
    slots.push({ time, available: hash(`${key}-${time}`) % 10 > 2 })
  }

  return slots
}

/** Franja horaria, para agrupar la grilla de horarios. */
export function slotPeriod(time: string) {
  const hour = Number(time.slice(0, 2))
  if (hour < 13) return "Mañana"
  if (hour < 18) return "Tarde"
  return "Noche"
}
