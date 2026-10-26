/** Fechas "YYYY-MM-DD" y minutos desde medianoche. Nunca Date para las cuentas: aplica la zona del proceso. */

/** "2026-10-20" */
export type FechaISO = string
/** "14:30" */
export type HoraHM = string

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

/** ISO 8601: 1 = lunes … 7 = domingo (como horarios_atencion). Ojo: getDay() de JS usa 0 = domingo. */
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

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** "2026-10-20" -> "martes 20 de octubre", para los mensajes a las clientas. */
export function fechaLarga(fecha: FechaISO): string {
  const [y, m, d] = fecha.split("-").map(Number)
  return `${DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`
}

/** "2026-10-17" + 3 -> "2026-10-20". */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [y, m, d] = fecha.split("-").map(Number)
  const r = new Date(y, m - 1, d + dias)
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, "0")}-${String(r.getDate()).padStart(2, "0")}`
}
