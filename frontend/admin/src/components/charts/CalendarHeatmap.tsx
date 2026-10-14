import { useState } from "react"
import type { DayMetric, DayStats } from "../../lib/stats"
import { metricLabels, rankOfDay } from "../../lib/stats"
import { formatLongDate, monthShortName } from "../../lib/format"
import { formatPrice } from "../../../ecommerce/lib/format"
import { fromDateKey } from "../../data/history"
import ChartTooltip from "./ChartTooltip"
import { chartColors, heatLevel } from "./theme"
import { useElementWidth } from "./useElementWidth"

type Props = {
  days: DayStats[]
  metric: DayMetric
  selected: string | null
  onSelect: (date: string) => void
}

const rowLabels = ["Lun", "", "Mié", "", "Vie", "", "Dom"]
const labelW = 34
const monthRowH = 18
const gap = 3

/**
 * Calendario de días movidos: cada cuadradito es un día, más rojo = más movido.
 * Columnas = semanas, filas = días de la semana (lunes arriba).
 */
export default function CalendarHeatmap({ days, metric, selected, onSelect }: Props) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<number | null>(null)

  const offset = days.length ? (days[0].weekday + 6) % 7 : 0
  const weeks = Math.ceil((days.length + offset) / 7)
  const cell = Math.max(10, Math.min(30, Math.floor((width - labelW) / Math.max(weeks, 1)) - gap))
  const svgW = labelW + weeks * (cell + gap)
  const svgH = monthRowH + 7 * (cell + gap)
  const max = Math.max(...days.map((d) => d[metric]), 0)

  const pos = (i: number) => {
    const col = Math.floor((i + offset) / 7)
    const row = (i + offset) % 7
    return { x: labelW + col * (cell + gap), y: monthRowH + row * (cell + gap) }
  }

  // Nombre del mes arriba de la primera semana en que aparece.
  const monthLabels: { x: number; label: string }[] = []
  days.forEach((d, i) => {
    const date = fromDateKey(d.date)
    if (i === 0 || date.getDate() === 1) {
      const x = pos(i).x
      if (!monthLabels.length || x - monthLabels[monthLabels.length - 1].x > 30) {
        monthLabels.push({ x, label: monthShortName(date.getMonth()) })
      }
    }
  })

  const describe = (d: DayStats) => {
    if (metric === "bookingCount" && d.weekday === 0 && d.bookingCount === 0) return "cerrado"
    return metricLabels[metric].unit(d[metric])
  }

  const hoveredDay = hovered !== null ? days[hovered] : null

  return (
    <div>
      <div ref={containerRef} className="relative">
        {width > 0 && (
          <svg width={svgW} height={svgH} role="group" aria-label={`Calendario de días movidos por ${metricLabels[metric].short.toLowerCase()}`} className="block">
            {monthLabels.map((m) => (
              <text key={`${m.label}-${m.x}`} x={m.x} y={12} fontSize={11} fill={chartColors.axisText}>
                {m.label}
              </text>
            ))}
            {rowLabels.map((label, row) =>
              label ? (
                <text key={label} x={0} y={monthRowH + row * (cell + gap) + cell / 2} dy="0.32em" fontSize={11} fill={chartColors.axisText}>
                  {label}
                </text>
              ) : null,
            )}

            {days.map((d, i) => {
              const { x, y } = pos(i)
              const level = heatLevel(d[metric], max)
              const isSelected = selected === d.date
              return (
                <rect
                  key={d.date}
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={4}
                  fill={level < 0 ? chartColors.empty : chartColors.heat[level]}
                  stroke={isSelected ? "#22261f" : hovered === i ? "#22261f55" : "none"}
                  strokeWidth={2}
                  role="button"
                  tabIndex={0}
                  aria-label={`${formatLongDate(d.date)}: ${describe(d)}`}
                  aria-pressed={isSelected}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setHovered(i)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect(d.date)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelect(d.date)
                    }
                  }}
                />
              )
            })}
          </svg>
        )}

        {hoveredDay && hovered !== null && (
          <ChartTooltip
            x={pos(hovered).x + cell / 2}
            y={pos(hovered).y}
            containerWidth={Math.max(width, svgW)}
            title={formatLongDate(hoveredDay.date)}
            rows={
              describe(hoveredDay) === "cerrado"
                ? [{ label: "", value: "Cerrado" }]
                : [
                    { label: "turnos", value: String(hoveredDay.bookingCount) },
                    { label: "ganancia", value: formatPrice(hoveredDay.total) },
                  ]
            }
            footer={hoveredDay[metric] > 0 ? `Puesto #${rankOfDay(hoveredDay, days, metric)} de ${days.length} días` : undefined}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <span>Tranquilo</span>
          {chartColors.heat.map((c) => (
            <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
          ))}
          <span>Muy movido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: chartColors.empty }} />
          <span>{metric === "bookingCount" ? "Sin turnos / cerrado" : "Sin actividad"}</span>
        </div>
      </div>
    </div>
  )
}
