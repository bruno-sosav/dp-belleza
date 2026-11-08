import { formatPrice } from "@dp/shared/lib/format"
import EstadoBadge from "./EstadoBadge"
import type { Turno } from "../api/turnos.api"

const motivoCancelacion: Partial<Record<NonNullable<Turno["canceladoPor"]>, string>> = {
  clienta: "Lo canceló la clienta desde la web",
  sistema: "No pagó la seña a tiempo",
}

/** Un turno completado, ausente o cancelado: su estado, lo que falta cobrar y "Deshacer". */
export default function EstadoTurnoCerrado({
  turno,
  falta,
  ocupado,
  onCobrar,
  onDeshacer,
}: {
  turno: Turno
  falta: number
  ocupado: boolean
  onCobrar: () => void
  onDeshacer: () => void
}) {
  const completado = turno.estado === "completado"
  const motivo = turno.canceladoPor && motivoCancelacion[turno.canceladoPor]

  return (
    <div className="flex flex-wrap items-center gap-4">
      <EstadoBadge estado={turno.estado} grande />
      {completado && falta > 0 && (
        <button
          type="button"
          onClick={onCobrar}
          className="min-h-12 rounded-xl bg-alerta-claro px-4 text-base font-semibold text-ink ring-1 ring-alerta/40 hover:bg-alerta-claro/70"
        >
          Falta cobrar {formatPrice(falta)} · Cobrar
        </button>
      )}
      {completado && falta <= 0 && <span className="text-base text-ink-soft">Cobrado {formatPrice(turno.cobrado)}</span>}
      {motivo && <span className="text-base text-ink-soft">{motivo}</span>}
      {(completado || turno.estado === "ausente") && (
        <button
          type="button"
          disabled={ocupado}
          onClick={onDeshacer}
          className="text-base text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-40"
        >
          Deshacer
        </button>
      )}
    </div>
  )
}
