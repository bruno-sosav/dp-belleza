/** Días cerrados: un período en que el local no atiende (feriado, vacaciones, un rato). Dominio puro. */

export type Bloqueo = {
  id: number
  /** "2026-12-24 00:00" */
  desde: string
  hasta: string
  motivo: string | null
}

/**
 * Por qué no se puede cerrar ese período, o null si se puede. Las fechas son
 * "YYYY-MM-DD HH:MM": se comparan bien en orden alfabético.
 */
export function problemaDeBloqueo(desde: string, hasta: string, ahora: string): string | null {
  if (hasta <= desde) return "El final tiene que ser después del comienzo."
  if (hasta <= ahora) return "Ese período ya pasó."
  return null
}
