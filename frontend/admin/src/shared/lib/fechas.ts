/**
 * Conversión entre la clave de fecha que usa la API ("2026-10-19") y Date.
 *
 * Siempre en horario LOCAL. `new Date("2026-10-19")` interpreta el string como
 * UTC y en Argentina devuelve el 18 a las 21:00, así que un día del calendario
 * aparecería corrido. Por eso se parsea a mano y se usa el constructor de
 * año/mes/día, que sí es local.
 *
 * Estas funciones vivían en data/history.ts, junto al generador de datos falsos.
 * Al conectar el panel a la API ese archivo se eliminó, pero las conversiones
 * siguen haciendo falta.
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
