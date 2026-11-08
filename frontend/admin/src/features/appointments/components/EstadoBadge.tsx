import Icono from "../../../shared/components/Icono"
import type { EstadoTurno } from "../api/turnos.api"
import { ESTADOS } from "../lib/estados"

/** Etiqueta del estado, con su color e ícono ("ausente" se muestra "No vino"). `grande`: turno recién marcado. */
export default function EstadoBadge({ estado, grande = false }: { estado: EstadoTurno; grande?: boolean }) {
  const { label, icono, etiqueta } = ESTADOS[estado]
  const tamaño = grande ? "gap-2 px-4 py-2 text-base font-semibold" : "gap-1.5 px-3 py-1 text-sm font-medium"
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full ${tamaño} ${etiqueta}`}>
      <Icono nombre={icono} className={grande ? "h-5 w-5" : "h-4 w-4"} />
      {label}
    </span>
  )
}
