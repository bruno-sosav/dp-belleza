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
