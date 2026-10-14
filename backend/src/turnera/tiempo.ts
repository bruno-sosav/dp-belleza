/**
 * Manejo de fechas y horas de la agenda.
 *
 * Todo se calcula en MINUTOS DESDE MEDIANOCHE y con fechas como string
 * "YYYY-MM-DD". Nunca se construye un `Date` para hacer las cuentas: el Date de
 * JavaScript aplica la zona horaria del proceso, y eso corre los turnos de hora
 * según dónde esté corriendo el servidor.
 */
import { badRequest } from "../shared/errors.ts"

/** "2026-10-20" */
export type FechaISO = string
/** "14:30" */
export type HoraHM = string

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validarFecha(fecha: string): FechaISO {
  if (!RE_FECHA.test(fecha)) throw badRequest("La fecha tiene que venir como YYYY-MM-DD.")
  const [y, m, d] = fecha.split("-").map(Number)
  // Se verifica que la fecha exista de verdad: el regex acepta 2026-02-31.
  const probe = new Date(y, m - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    throw badRequest(`La fecha ${fecha} no existe.`)
  }
  return fecha
}

export function validarHora(hora: string): HoraHM {
  if (!RE_HORA.test(hora)) throw badRequest("La hora tiene que venir como HH:MM en 24hs.")
  return hora
}

/** "14:30" -> 870 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

/** 870 -> "14:30" */
export function aHora(minutos: number): HoraHM {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Día de la semana en ISO 8601: 1 = lunes ... 7 = domingo.
 *
 * `horarios_atencion.dia_semana` usa esta convención porque el CHECK de V1 es
 * `BETWEEN 1 AND 7`, que descarta el 0. OJO: NO es la de JavaScript, donde
 * getDay() devuelve 0 para domingo. El front usa la de JavaScript, así que al
 * conectar hay que convertir en un solo lado — acá.
 */
export function diaSemanaISO(fecha: FechaISO): number {
  const [y, m, d] = fecha.split("-").map(Number)
  const js = new Date(y, m - 1, d).getDay()
  return js === 0 ? 7 : js
}

/** "2026-10-20" + "14:30" -> "2026-10-20 14:30:00", como lo guarda MySQL. */
export function aDateTime(fecha: FechaISO, minutos: number): string {
  return `${fecha} ${aHora(minutos)}:00`
}

/** Hoy en horario local del servidor, como "YYYY-MM-DD". */
export function hoy(): FechaISO {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function minutosAhora(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Dos rangos [a1,a2) y [b1,b2) se solapan si a1 < b2 y b1 < a2. */
export function seSolapan(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2
}
