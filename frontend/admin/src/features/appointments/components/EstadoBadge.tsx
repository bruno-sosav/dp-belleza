import type { EstadoTurno } from "../api/turnos.api"

const estilos: Record<EstadoTurno, { label: string; className: string }> = {
  reservado: { label: "Reservado", className: "bg-cream-dark text-ink" },
  confirmado: { label: "Confirmado", className: "bg-rose/30 text-ink" },
  completado: { label: "✅ Completado", className: "bg-[#dcf2e3] text-[#18703d]" },
  ausente: { label: "❌ No vino", className: "bg-[#fbe4e2] text-[#a12b28]" },
  cancelado: { label: "Cancelado", className: "bg-transparent text-ink-soft line-through ring-1 ring-cream-dark" },
}

/** Etiqueta del estado ("ausente" se muestra "No vino"). `grande`: resultado de un turno recién marcado. */
export default function EstadoBadge({ estado, grande = false }: { estado: EstadoTurno; grande?: boolean }) {
  const { label, className } = estilos[estado]
  const tamaño = grande ? "px-4 py-2 text-base font-semibold" : "px-2.5 py-0.5 text-sm font-medium"
  return <span className={`inline-flex shrink-0 items-center rounded-full ${tamaño} ${className}`}>{label}</span>
}
