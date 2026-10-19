/** Lo que SALE por HTTP de la agenda: solo lo que usan la web y el panel. */
import type { TurnoPedido } from "../domain/agenda.ports.js"
import type { Bloqueo } from "../domain/bloqueo.js"
import type { Slot } from "../domain/disponibilidad.js"
import type { Franja } from "../domain/horario.js"

export const aFranja = (f: Franja) => ({ diaSemana: f.diaSemana, desde: f.desde, hasta: f.hasta })

/** Un horario para elegir. Claves en inglés: es el contrato que ya usa la web. */
export const aSlot = (s: Slot) => ({ time: s.hora, available: s.libre })

export const aBloqueo = (b: Bloqueo) => ({ id: b.id, desde: b.desde, hasta: b.hasta, motivo: b.motivo })

/** Un turno que quedó afuera: lo que muestra el panel para avisarle a la clienta por WhatsApp. */
export const aTurnoParaAvisar = (t: TurnoPedido) => ({
  id: t.id,
  fecha: t.fecha,
  horaInicio: t.horaInicio,
  servicio: { nombre: t.servicio },
  cliente: t.cliente,
})
