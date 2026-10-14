import type { ReactNode } from "react"

export type TooltipRow = { label: string; value: string; color?: string }

/** Cartelito que aparece al pasar el mouse. El valor va en negrita y el nombre después. */
export default function ChartTooltip({
  x,
  y,
  containerWidth,
  title,
  rows,
  footer,
}: {
  x: number
  y: number
  containerWidth: number
  title: string
  rows: TooltipRow[]
  footer?: ReactNode
}) {
  const width = 190
  const left = Math.min(Math.max(x - width / 2, 0), Math.max(containerWidth - width, 0))

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg border border-ink/10 bg-surface px-3 py-2.5 shadow-lg"
      style={{ left, top: Math.max(y - 12, 0), width, transform: "translateY(-100%)" }}
    >
      <p className="text-xs font-medium text-ink-soft first-letter:uppercase">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />}
            <span className="font-semibold text-ink">{r.value}</span>
            <span className="text-ink-soft">{r.label}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t border-cream-dark pt-1.5 text-xs text-ink-soft">{footer}</div>}
    </div>
  )
}
