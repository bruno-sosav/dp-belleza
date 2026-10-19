/**
 * Qué horarios ofrecer para un servicio en un día. Función PURA: recibe todo
 * lo que necesita (franjas, lo ocupado, la hora actual, las reglas) y no toca
 * la base. Antes estaba mezclada con las consultas en calcularDisponibilidad.
 */
import { aHora, aMinutos, seSolapan } from "../../../core/tiempo.js"
import type { Momento } from "../../../core/reloj.js"
import type { Franja } from "./horario.js"
import { problemaDeAnticipacion, type ReglasReserva } from "./reglasReserva.js"

/** Un rango ocupado del día, en minutos desde medianoche: un turno o un bloqueo. */
export type Ocupado = { desde: number; hasta: number }

export type Slot = { hora: string; libre: boolean }

export function horariosDelDia(p: {
  fecha: string
  franjas: Franja[]
  duracionMin: number
  /** Cada cuántos minutos se ofrece un horario (Turnos → Reglas). */
  paso: number
  ocupados: Ocupado[]
  ahora: Momento
  /** Solo la web: anticipación mínima y máxima. El panel no las aplica. */
  reglas: ReglasReserva | null
}): Slot[] {
  // Más allá del máximo de días, la web no ofrece nada ese día.
  if (p.reglas && problemaDeAnticipacion(p.fecha, 23 * 60 + 59, { fecha: p.ahora.fecha, minutos: 0 }, { minHoras: 0, maxDias: p.reglas.maxDias })) {
    return []
  }
  const esHoy = p.fecha === p.ahora.fecha
  const slots: Slot[] = []
  for (const franja of p.franjas) {
    const cierre = aMinutos(franja.hasta)
    // El turno tiene que TERMINAR antes del cierre, no solo empezar antes.
    for (let inicio = aMinutos(franja.desde); inicio + p.duracionMin <= cierre; inicio += p.paso) {
      const fin = inicio + p.duracionMin
      const pisado = p.ocupados.some((o) => seSolapan(inicio, fin, o.desde, o.hasta))
      const yaPaso = esHoy && inicio <= p.ahora.minutos
      const muyPronto = p.reglas !== null && problemaDeAnticipacion(p.fecha, inicio, p.ahora, p.reglas) !== null
      slots.push({ hora: aHora(inicio), libre: !pisado && !yaPaso && !muyPronto })
    }
  }
  return slots
}

/**
 * La parte de un rango ("2026-12-24 00:00:00" a "2026-12-26 00:00:00") que cae
 * en ese día, en minutos. Un bloqueo puede empezar antes o terminar después.
 */
export function recortarAlDia(inicio: string, fin: string, fecha: string): Ocupado {
  return {
    desde: inicio.slice(0, 10) < fecha ? 0 : aMinutos(inicio.slice(11, 16)),
    hasta: fin.slice(0, 10) > fecha ? 24 * 60 : aMinutos(fin.slice(11, 16)),
  }
}
