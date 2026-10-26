/**
 * Claves de fecha de la API ("2026-10-19") ↔ Date, siempre en hora local:
 * `new Date("2026-10-19")` es UTC y en Argentina cae el día anterior.
 */

/** "2026-10-19" -> Date local. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Date -> "2026-10-19", sin pasar por UTC. */
export function toDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "2026-10-15" + 3 -> "2026-10-18". Negativo para ir hacia atrás. */
export function sumarDias(fecha: string, dias: number): string {
  const d = fromDateKey(fecha)
  d.setDate(d.getDate() + dias)
  return toDateKey(d)
}

/** El lunes de la semana de esa fecha. La agenda arranca la semana en lunes, como en Argentina. */
export function lunesDeSemana(fecha: string): string {
  const d = fromDateKey(fecha)
  const desdeLunes = (d.getDay() + 6) % 7
  return sumarDias(fecha, -desdeLunes)
}

/** Día de la semana ISO (1 = lunes … 7 = domingo), la convención de `horarios_atencion`. */
export function diaSemanaISO(fecha: string): number {
  return fromDateKey(fecha).getDay() || 7
}
