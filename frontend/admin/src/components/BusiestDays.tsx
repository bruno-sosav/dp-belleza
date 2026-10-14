import type { DayMetric, DayStats } from "../lib/stats"
import { busiestDays, metricLabels } from "../lib/stats"
import { formatShortDate } from "../lib/format"
import { chartColors, heatLevel } from "./charts/theme"

/** Top de días más movidos del período. Al tocar uno se selecciona en el calendario. */
export default function BusiestDays({
  days,
  metric,
  selected,
  onSelect,
  limit = 5,
}: {
  days: DayStats[]
  metric: DayMetric
  selected: string | null
  onSelect: (date: string) => void
  limit?: number
}) {
  const top = busiestDays(days, metric).slice(0, limit)
  const max = Math.max(...days.map((d) => d[metric]), 0)

  return (
    <ol className="divide-y divide-cream-dark">
      {top.map((d, i) => (
        <li key={d.date}>
          <button
            type="button"
            onClick={() => onSelect(d.date)}
            className={`flex w-full items-center gap-3 px-2 py-2.5 text-left text-sm transition hover:bg-cream-dark/40 ${selected === d.date ? "bg-cream-dark/60" : ""}`}
          >
            <span className="w-5 text-right text-xs tabular-nums text-ink-soft">{i + 1}.</span>
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: chartColors.heat[Math.max(heatLevel(d[metric], max), 0)] }} />
            <span className="flex-1 text-ink first-letter:uppercase">{formatShortDate(d.date)}</span>
            <span className="font-semibold tabular-nums text-ink">{metricLabels[metric].unit(d[metric])}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
