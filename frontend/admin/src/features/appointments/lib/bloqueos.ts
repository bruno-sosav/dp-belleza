/**
 * Cuentas y textos de los bloqueos. Las fechas vienen como "2026-12-24 00:00":
 * se cortan strings, igual que con los turnos, sin pasar por Date.
 */
import type { Bloqueo } from "../api/agenda.api"
import { aMinutos } from "./agenda"
import { sumarDias } from "../../../shared/lib/fechas"
import { formatLongDate } from "../../../shared/lib/format"

const fecha = (fh: string) => fh.slice(0, 10)
const hora = (fh: string) => fh.slice(11, 16)

/** Un bloqueo "de días enteros" va de las 00:00 de un día a las 00:00 de otro. */
export const esDeDiasEnteros = (b: Bloqueo) => hora(b.desde) === "00:00" && hora(b.hasta) === "00:00"

/** "miércoles 24 de diciembre" · "del lunes 5 al viernes 9 de enero" · "jueves 20 de 14:00 a 16:00" */
export function describirBloqueo(b: Bloqueo): string {
  if (esDeDiasEnteros(b)) {
    const ultimo = sumarDias(fecha(b.hasta), -1)
    return ultimo === fecha(b.desde)
      ? `${formatLongDate(ultimo)}, todo el día`
      : `Del ${formatLongDate(fecha(b.desde))} al ${formatLongDate(ultimo)}`
  }
  if (fecha(b.desde) === fecha(b.hasta)) return `${formatLongDate(fecha(b.desde))}, de ${hora(b.desde)} a ${hora(b.hasta)}`
  return `Del ${formatLongDate(fecha(b.desde))} a las ${hora(b.desde)} al ${formatLongDate(fecha(b.hasta))} a las ${hora(b.hasta)}`
}

/** La parte del bloqueo que cae en ese día, en minutos desde medianoche; null si no lo pisa. */
export function bloqueoEnElDia(b: Bloqueo, dia: string): { desde: number; hasta: number } | null {
  if (fecha(b.desde) > dia || b.hasta <= `${dia} 00:00`) return null
  const desde = fecha(b.desde) < dia ? 0 : aMinutos(hora(b.desde))
  const hasta = fecha(b.hasta) > dia ? 24 * 60 : aMinutos(hora(b.hasta))
  return hasta > desde ? { desde, hasta } : null
}
