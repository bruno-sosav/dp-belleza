/**
 * Reglas de la reserva web: anticipación mínima, máxima y tope de turnos pedidos por teléfono.
 * No aplican a los turnos que da la dueña.
 */
export type ReglasReserva = { minHoras: number; maxDias: number }

/** Cuántos turnos pedidos (a futuro) puede tener una misma clienta reservados desde la web. */
export const MAX_TURNOS_PEDIDOS_WEB = 3

/** Minutos entre dos momentos "YYYY-MM-DD" + minutos desde medianoche (misma zona horaria). */
function minutosEntre(fechaA: string, minA: number, fechaB: string, minB: number) {
  const dia = (f: string) => {
    const [y, m, d] = f.split("-").map(Number)
    return Date.UTC(y, m - 1, d) / 60_000
  }
  return dia(fechaB) + minB - (dia(fechaA) + minA)
}

/** Motivo para la clienta por el que no puede reservar ahí, o null. */
export function problemaDeAnticipacion(
  fecha: string,
  inicioMin: number,
  ahora: { fecha: string; minutos: number },
  reglas: ReglasReserva,
): string | null {
  const faltan = minutosEntre(ahora.fecha, ahora.minutos, fecha, inicioMin)
  if (faltan < reglas.minHoras * 60) {
    return reglas.minHoras === 1
      ? "Los turnos se reservan con al menos 1 hora de anticipación. Elegí un horario más adelante."
      : `Los turnos se reservan con al menos ${reglas.minHoras} horas de anticipación. Elegí un horario más adelante.`
  }
  if (minutosEntre(ahora.fecha, 0, fecha, 0) > reglas.maxDias * 24 * 60) {
    return `Se puede reservar hasta ${reglas.maxDias} días para adelante.`
  }
  return null
}
