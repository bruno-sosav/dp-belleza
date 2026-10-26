/**
 * Cuentas de la agenda semanal: dónde va cada turno en la grilla.
 *
 * Todo en minutos desde medianoche, igual que el backend (core/tiempo.util.ts):
 * así no se pasa por Date y no hay corrimientos de zona horaria.
 */
import type { EstadoTurno, Turno } from "../api/turnos.api"

/** "14:30" -> 870 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

export type Carril = { carril: number; carriles: number }

/**
 * Si dos turnos se pisan (puede pasar con un "no vino": libera el horario y
 * alguien más lo reserva), se dibujan uno al lado del otro en vez de uno encima
 * del otro. Devuelve, para cada turno, en qué carril va y cuántos carriles tiene
 * su grupo, para calcular el ancho.
 */
export function asignarCarriles(turnos: Turno[]): Map<number, Carril> {
  const resultado = new Map<number, Carril>()
  const ordenados = [...turnos].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  let grupo: { id: number; carril: number }[] = []
  let finDelGrupo = 0
  let finPorCarril: number[] = []

  const cerrarGrupo = () => {
    for (const g of grupo) resultado.set(g.id, { carril: g.carril, carriles: finPorCarril.length })
    grupo = []
    finPorCarril = []
    finDelGrupo = 0
  }

  for (const t of ordenados) {
    const inicio = aMinutos(t.horaInicio)
    const fin = aMinutos(t.horaFin)
    if (grupo.length && inicio >= finDelGrupo) cerrarGrupo()

    let carril = finPorCarril.findIndex((f) => f <= inicio)
    if (carril === -1) carril = finPorCarril.push(fin) - 1
    else finPorCarril[carril] = fin

    grupo.push({ id: t.id, carril })
    finDelGrupo = Math.max(finDelGrupo, fin)
  }
  cerrarGrupo()
  return resultado
}

/**
 * Un turno reservado en la web que todavía espera el pago de la seña: puede
 * liberarse solo si no la pagan a tiempo. En la agenda se ve punteado y con ⏳
 * para que no parezca un turno firme.
 */
export const esperandoSena = (t: Turno) => t.estado === "reservado" && t.sena?.estado === "pendiente"

export const bloqueEsperandoSena = "border-dashed border-[#e0b44a] bg-[#fdf3dc] text-ink"

/** Color de cada turno en el calendario. Es la misma lógica que la etiqueta de estado. */
export const coloresBloque: Record<EstadoTurno, string> = {
  reservado: "border-ink/25 bg-surface text-ink",
  confirmado: "border-rose-dark bg-rose/35 text-ink",
  completado: "border-[#1f8a4c] bg-[#dcf2e3] text-[#14532d]",
  ausente: "border-[#c0392b] bg-[#fbe4e2] text-[#7f1d1d]",
  cancelado: "border-dashed border-ink/20 bg-cream text-ink-soft line-through",
}
