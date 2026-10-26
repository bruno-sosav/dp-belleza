/**
 * Estados y transiciones permitidas. reservado: web · confirmado: la dueña · completado: suma plata
 * · ausente: no vino · cancelado: libera el horario.
 */
export const ESTADOS_TURNO = ["reservado", "confirmado", "completado", "ausente", "cancelado"] as const
export type EstadoTurno = (typeof ESTADOS_TURNO)[number]

/** Estados que siguen ocupando lugar en la agenda. Un turno cancelado libera el horario. */
export const ESTADOS_OCUPAN = ["reservado", "confirmado", "completado"] as const

const TRANSICIONES: Record<EstadoTurno, EstadoTurno[]> = {
  // Se puede completar sin haber confirmado antes: en el local muchas veces la
  // clienta llega y listo, nadie pasó por "confirmado".
  reservado: ["confirmado", "completado", "ausente", "cancelado"],
  confirmado: ["completado", "ausente", "cancelado"],
  // Completado y ausente se pueden deshacer (vuelven a confirmado) porque en el
  // celular es fácil tocar el botón equivocado. Cancelado es final: el horario
  // ya se liberó y puede haberlo tomado otra persona.
  completado: ["confirmado"],
  ausente: ["confirmado"],
  cancelado: [],
}

export function puedeCambiarEstadoTurno(actual: EstadoTurno, nuevo: EstadoTurno): boolean {
  return TRANSICIONES[actual].includes(nuevo)
}

/** Estados que solo tienen sentido una vez que el turno empezó. */
export function requiereHaberEmpezado(estado: EstadoTurno): boolean {
  return estado === "completado" || estado === "ausente"
}

export function ocupaAgenda(estado: EstadoTurno): boolean {
  return (ESTADOS_OCUPAN as readonly EstadoTurno[]).includes(estado)
}
