import { formatPrice } from "../../../ecommerce/lib/format"

export type RankingItem = { id: string; name: string; count: number; revenue: number; inactive?: boolean }

/**
 * Ranking con barras horizontales (ej: productos más vendidos). Cada fila muestra
 * el número, así que funciona también como tabla: la barra solo ayuda a comparar.
 */
export default function RankingList({
  items,
  color,
  countLabel,
  emptyText = "Todavía no hay datos en este período.",
}: {
  items: RankingItem[]
  color: string
  countLabel: (n: number) => string
  emptyText?: string
}) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-ink-soft">{emptyText}</p>

  const max = Math.max(...items.map((i) => i.count), 1)

  return (
    <ol className="space-y-3.5">
      {items.map((item, index) => (
        <li key={item.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">
              <span className="mr-2 inline-block w-5 text-right text-xs tabular-nums text-ink-soft">{index + 1}.</span>
              {item.name}
              {item.inactive && <span className="ml-2 rounded-full bg-cream-dark px-2 py-0.5 text-[10px] text-ink-soft">De baja</span>}
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{countLabel(item.count)}</span>
              <span className="ml-2 text-xs text-ink-soft">{formatPrice(item.revenue)}</span>
            </span>
          </div>
          <div className="mt-1.5 ml-7 h-2 rounded-full bg-cream-dark/60">
            <div className="h-2 rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  )
}
