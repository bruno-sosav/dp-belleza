import { useEffect, useState } from "react"
import { toDateKey } from "./fechas"

export type Ahora = {
  /** "2026-10-15" */
  fecha: string
  /** "14:30", comparable como string con las horas de los turnos. */
  hora: string
}

function leerAhora(): Ahora {
  const d = new Date()
  return {
    fecha: toDateKey(d),
    hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
}

/**
 * Fecha y hora actuales, actualizadas cada minuto.
 *
 * La pantalla de inicio queda abierta todo el día en el local: sin esto, el
 * turno "en curso" y los botones de "Completado" se quedarían congelados en la
 * hora en que se abrió la página.
 */
export function useAhora(): Ahora {
  const [ahora, setAhora] = useState(leerAhora)
  useEffect(() => {
    const id = setInterval(() => setAhora(leerAhora()), 60_000)
    return () => clearInterval(id)
  }, [])
  return ahora
}
