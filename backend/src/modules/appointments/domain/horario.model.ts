/**
 * El horario de atención: las franjas de cada día de la semana. Dominio puro.
 */
import { aMinutos, diaSemanaISO, type FechaISO } from "../../../core/tiempo.util.js"

/** Una franja de un día. 1 = lunes ... 7 = domingo. */
export type Franja = { diaSemana: number; desde: string; hasta: string }

const nombresDia = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

/**
 * Por qué no se puede guardar este horario, o null si está bien. Un día puede
 * tener varias franjas (mañana y tarde, cerrando al mediodía), pero no se
 * pueden pisar entre sí: la disponibilidad las recorre por separado y ofrecería
 * horarios repetidos.
 */
export function problemaEnFranjas(franjas: Franja[]): string | null {
  for (const f of franjas) {
    if (aMinutos(f.hasta) <= aMinutos(f.desde)) {
      return `El ${nombresDia[f.diaSemana]}: la hora de cierre (${f.hasta}) tiene que ser después de la de apertura (${f.desde}).`
    }
  }
  for (let dia = 1; dia <= 7; dia++) {
    const delDia = franjas
      .filter((f) => f.diaSemana === dia)
      .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde))
    for (let i = 1; i < delDia.length; i++) {
      if (aMinutos(delDia[i].desde) < aMinutos(delDia[i - 1].hasta)) {
        return `El ${nombresDia[dia]} tiene dos horarios que se pisan (${delDia[i - 1].desde} a ${delDia[i - 1].hasta} y ${delDia[i].desde} a ${delDia[i].hasta}).`
      }
    }
  }
  return null
}

/** Si un turno de ese día de la semana, de `inicio` a `fin`, entra completo en alguna franja. */
export function entraEnHorario(diaSemana: number, inicio: string, fin: string, franjas: Franja[]): boolean {
  return franjas.some(
    (f) => f.diaSemana === diaSemana && aMinutos(inicio) >= aMinutos(f.desde) && aMinutos(fin) <= aMinutos(f.hasta),
  )
}

/** Las franjas de ese día (vacío = cerrado). */
export function franjasDelDia(franjas: Franja[], fecha: FechaISO): Franja[] {
  return franjas.filter((f) => f.diaSemana === diaSemanaISO(fecha))
}

/**
 * Por qué un turno no entra en el horario de atención de ese día, o null si
 * entra. Lo usan reservar y reprogramar (la dueña puede saltearlo a propósito).
 */
export function problemaDeHorario(delDia: Franja[], inicio: number, fin: number, duracionMin: number): string | null {
  if (!delDia.length) return "Ese día el local no atiende."
  if (!delDia.some((f) => inicio >= aMinutos(f.desde) && fin <= aMinutos(f.hasta))) {
    return `El turno de ${duracionMin} minutos no entra en el horario de atención de ese día.`
  }
  return null
}
