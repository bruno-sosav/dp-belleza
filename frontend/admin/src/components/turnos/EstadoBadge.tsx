import type { EstadoTurno } from "../../data/turnos"

const estilos: Record<EstadoTurno, { label: string; className: string }> = {
  reservado: { label: "Reservado", className: "bg-cream-dark text-ink-soft" },
  confirmado: { label: "Confirmado", className: "bg-rose/30 text-ink" },
  completado: { label: "Completado", className: "bg-ink text-cream" },
  ausente: { label: "No vino", className: "bg-[#fbe4e2] text-[#a12b28]" },
  cancelado: { label: "Cancelado", className: "bg-transparent text-ink-soft line-through ring-1 ring-cream-dark" },
}

/** Etiqueta del estado de un turno. "ausente" se muestra como "No vino", que es como lo dice la dueña. */
export default function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  const { label, className } = estilos[estado]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
