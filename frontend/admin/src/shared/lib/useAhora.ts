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

/** Fecha y hora actuales, refrescadas cada minuto: Hoy queda abierta todo el día en el local. */
export function useAhora(): Ahora {
  const [ahora, setAhora] = useState(leerAhora)
  useEffect(() => {
    const id = setInterval(() => setAhora(leerAhora()), 60_000)
    return () => clearInterval(id)
  }, [])
  return ahora
}
