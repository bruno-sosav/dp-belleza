import type { NombreIcono } from "../../../shared/components/Icono"
import type { EstadoTurno, Turno } from "../api/turnos.api"

type Estilo = {
  label: string
  icono: NombreIcono
  /** La etiqueta (ficha de la clienta, turno ya marcado). */
  etiqueta: string
  /** El bloque del calendario: borde izquierdo de color y fondo claro del mismo tono. */
  bloque: string
}

/** Un solo lugar para el color, el ícono y el texto de cada estado: etiqueta, calendario y leyenda. */
export const ESTADOS: Record<EstadoTurno, Estilo> = {
  reservado: { label: "Reservado", icono: "reloj", etiqueta: "bg-cream-dark text-ink", bloque: "border-ink/35 bg-surface text-ink" },
  confirmado: { label: "Confirmado", icono: "mensaje", etiqueta: "bg-info-claro text-info", bloque: "border-info bg-info-claro text-ink" },
  completado: { label: "Completado", icono: "check", etiqueta: "bg-exito-claro text-exito", bloque: "border-exito bg-exito-claro text-ink" },
  ausente: { label: "No vino", icono: "cruz", etiqueta: "bg-peligro-claro text-peligro", bloque: "border-peligro bg-peligro-claro text-ink" },
  cancelado: { label: "Cancelado", icono: "bloqueo", etiqueta: "bg-transparent text-ink-soft line-through ring-1 ring-cream-dark", bloque: "border-dashed border-ink/20 bg-cream text-ink-soft line-through" },
}

/** Reservado en la web esperando seña: puede liberarse solo. Punteado, ámbar y con un reloj. */
export const esperandoSena = (t: Turno) => t.estado === "reservado" && t.sena?.estado === "pendiente"

export const SENA_PENDIENTE = { label: "Esperando la seña", icono: "reloj", bloque: "border-dashed border-alerta bg-alerta-claro text-ink" } as const

/** El estilo con el que se dibuja un turno en el calendario. */
export const estiloDeBloque = (t: Turno) => (esperandoSena(t) ? SENA_PENDIENTE : ESTADOS[t.estado])
