/** Posición de cada turno en la grilla. En minutos desde medianoche, como el backend: sin Date ni zonas horarias. */
import type { Turno } from "../api/turnos.api"

/** "14:30" -> 870 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

export type Carril = { carril: number; carriles: number }

/** Turnos que se pisan (un "no vino" libera el horario) se dibujan lado a lado: carril y total de carriles. */
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
