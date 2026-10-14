import { useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import ChartTooltip from "./ChartTooltip"
import { chartColors } from "./theme"
import { useElementWidth } from "./useElementWidth"

export type ColumnSeries = { key: string; label: string; color: string }
export type ColumnDatum = {
  key: string
  /** Texto corto debajo de la columna. */
  axisLabel: string
  /** Título del tooltip y de la fila en la tabla. */
  title: string
  values: Record<string, number>
}

type Props = {
  data: ColumnDatum[]
  series: ColumnSeries[]
  /** Formato completo (tooltip, tabla). */
  formatValue: (n: number) => string
  /** Formato corto para el eje. */
  formatAxis?: (n: number) => string
  height?: number
  /** Número arriba de cada columna. Solo para pocas columnas. */
  showValueLabels?: boolean
  ariaLabel: string
  /** Encabezado de la primera columna en la vista de tabla. */
  firstColumnLabel?: string
}

const margin = { top: 22, right: 8, bottom: 28, left: 64 }
const segmentGap = 2

function niceStep(raw: number) {
  if (raw <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}

/** Rectángulo con las esquinas de arriba redondeadas y la base recta. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

/** Columnas (apiladas si hay más de una serie) con tooltip, leyenda y vista de tabla. */
export default function ColumnChart({ data, series, formatValue, formatAxis = formatValue, height = 240, showValueLabels = false, ariaLabel, firstColumnLabel = "Fecha" }: Props) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const sums = data.map((d) => series.reduce((acc, s) => acc + (d.values[s.key] ?? 0), 0))
  const step = niceStep(Math.max(...sums, 1) / 4)
  const maxY = step * 4
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)

  const plotW = Math.max(width - margin.left - margin.right, 0)
  const plotH = height - margin.top - margin.bottom
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(1, Math.min(24, slot * 0.72, slot - segmentGap))
  const y = (v: number) => margin.top + plotH - (v / maxY) * plotH

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 56))))

  function handlePointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left - margin.left) / slot)
    setActive(i >= 0 && i < data.length ? i : null)
  }

  function handleKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight") setActive((i) => Math.min((i ?? -1) + 1, data.length - 1))
    else if (e.key === "ArrowLeft") setActive((i) => Math.max((i ?? data.length) - 1, 0))
    else return
    e.preventDefault()
  }

  const activeDatum = active !== null ? data[active] : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {series.length > 1 ? (
          <ul className="flex flex-wrap gap-4 text-xs text-ink-soft">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline">
          {showTable ? "Ver gráfico" : "Ver como tabla"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-80 overflow-auto rounded-lg border border-cream-dark">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-cream-dark/70 text-xs text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">{firstColumnLabel}</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">{s.label}</th>
                ))}
                {series.length > 1 && <th className="px-3 py-2 text-right font-medium">Total</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d, i) => (
                <tr key={d.key} className="border-t border-cream-dark">
                  <td className="px-3 py-1.5 text-ink-soft first-letter:uppercase">{d.title}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right text-ink">{formatValue(d.values[s.key] ?? 0)}</td>
                  ))}
                  {series.length > 1 && <td className="px-3 py-1.5 text-right font-medium text-ink">{formatValue(sums[i])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative" style={{ height }}>
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={ariaLabel}
              tabIndex={0}
              className="block outline-none focus-visible:ring-2 focus-visible:ring-rose/40"
              onPointerMove={handlePointer}
              onPointerLeave={() => setActive(null)}
              onKeyDown={handleKey}
              onBlur={() => setActive(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={margin.left} x2={width - margin.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? chartColors.axis : chartColors.grid} strokeWidth={1} />
                  <text x={margin.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={chartColors.axisText} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatAxis(t)}
                  </text>
                </g>
              ))}

              {data.map((d, i) => {
                const x = margin.left + i * slot + (slot - barW) / 2
                let base = margin.top + plotH
                const drawn = series.filter((s) => (d.values[s.key] ?? 0) > 0)
                const dim = active !== null && active !== i

                return (
                  <g key={d.key} opacity={dim ? 0.45 : 1}>
                    {drawn.map((s, si) => {
                      const h = ((d.values[s.key] ?? 0) / maxY) * plotH
                      const top = base - h
                      const bottom = si === 0 ? base : base - segmentGap
                      base = top
                      const segH = Math.max(bottom - top, 0.5)
                      return si === drawn.length - 1 ? (
                        <path key={s.key} d={topRoundedRect(x, top, barW, segH, 4)} fill={s.color} />
                      ) : (
                        <rect key={s.key} x={x} y={top} width={barW} height={segH} fill={s.color} />
                      )
                    })}
                    {showValueLabels && sums[i] > 0 && (
                      <text x={x + barW / 2} y={y(sums[i]) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#22261f">
                        {formatAxis(sums[i])}
                      </text>
                    )}
                    {(data.length - 1 - i) % labelEvery === 0 && (
                      <text
                        x={x + barW / 2}
                        y={height - 8}
                        textAnchor={x + barW / 2 > width - 28 ? "end" : "middle"}
                        fontSize={11}
                        fill={chartColors.axisText}
                      >
                        {d.axisLabel}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {activeDatum && active !== null && (
            <ChartTooltip
              x={margin.left + active * slot + slot / 2}
              y={y(sums[active])}
              containerWidth={width}
              title={activeDatum.title}
              rows={[
                ...series.map((s) => ({ label: s.label, value: formatValue(activeDatum.values[s.key] ?? 0), color: s.color })),
                ...(series.length > 1 ? [{ label: "total", value: formatValue(sums[active]) }] : []),
              ]}
            />
          )}
        </div>
      )}
    </div>
  )
}
