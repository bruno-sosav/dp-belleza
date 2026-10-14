import { percentChange } from "../lib/stats"
import { chartColors } from "./charts/theme"

/** Tarjeta con un número clave y cuánto cambió respecto del período anterior. */
export default function StatTile({
  label,
  value,
  current,
  previous,
  compareLabel,
  upIsGood = true,
  accent,
}: {
  label: string
  value: string
  current: number
  previous: number
  compareLabel: string
  upIsGood?: boolean
  /** Color de la serie a la que pertenece (tienda / turnos). */
  accent?: string
}) {
  const change = percentChange(current, previous)
  const rounded = change === null ? null : Math.round(change)
  const good = rounded !== null && (upIsGood ? rounded >= 0 : rounded <= 0)

  return (
    <div className="rounded-2xl border border-cream-dark bg-surface p-5">
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        {accent && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} />}
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {rounded !== null ? (
        <p className="mt-2 text-xs text-ink-soft">
          <span className="font-semibold" style={{ color: good ? chartColors.up : chartColors.down }}>
            {rounded > 0 ? "▲" : rounded < 0 ? "▼" : "="} {rounded > 0 ? "+" : ""}
            {rounded}%
          </span>{" "}
          {compareLabel}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">Sin datos para comparar</p>
      )}
    </div>
  )
}
