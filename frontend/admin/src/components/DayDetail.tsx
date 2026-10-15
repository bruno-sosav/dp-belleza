import { formatPrice } from "@dp/shared/lib/format"
import type { DayMetric, DayStats } from "../lib/stats"
import { metricLabels, rankOfDay, sameDayLastWeek } from "../lib/stats"
import { useServiciosDelDia } from "../data/estadisticas"
import { formatLongDate, formatShortDate, weekdayName } from "../lib/format"
import { chartColors } from "./charts/theme"

/**
 * Detalle de un día elegido en el calendario: cuánto se hizo, en qué puesto quedó
 * dentro del período y cómo le fue contra el mismo día de la semana anterior.
 */
export default function DayDetail({
  day,
  days,
  allDays,
  metric,
}: {
  day: DayStats
  /** Los días del período, para el puesto dentro del período. */
  days: DayStats[]
  /** La serie completa, para poder mirar el mismo día de la semana anterior
   *  aunque caiga fuera del período elegido. */
  allDays: DayStats[]
  metric: DayMetric
}) {
  // Qué se hizo ese día: lo trae la API, no se calcula acá.
  const { datos: serviciosDelDia } = useServiciosDelDia(day.date)

  const closed = day.weekday === 0 && day.bookingCount === 0
  const rank = rankOfDay(day, days, metric)
  const isTop = day[metric] > 0 && rank <= 5
  const lastWeek = sameDayLastWeek(allDays, day)
  const diff = lastWeek ? day[metric] - lastWeek[metric] : null
  const topServicesOfDay = (serviciosDelDia ?? []).slice(0, 3)
  const unit = metricLabels[metric].unit

  return (
    <div className="rounded-xl bg-cream-dark/50 p-5">
      <p className="text-xs uppercase tracking-wide text-ink-soft">Día seleccionado</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink first-letter:uppercase">{formatLongDate(day.date)}</p>

      {isTop && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">
          <span className="h-2 w-2 rounded-full" style={{ background: chartColors.heat[3] }} />
          {rank === 1 ? "El día más movido" : `Uno de los 5 días más movidos (#${rank})`} del período
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-ink-soft">Turnos realizados</dt>
          <dd className="mt-0.5 text-2xl font-semibold text-ink">{closed ? "Cerrado" : day.bookingCount}</dd>
          {day.cancelledCount > 0 && <dd className="text-xs text-ink-soft">{day.cancelledCount} cancelado{day.cancelledCount > 1 ? "s" : ""}</dd>}
        </div>
        <div>
          <dt className="text-xs text-ink-soft">Ganancia del día</dt>
          <dd className="mt-0.5 text-2xl font-semibold text-ink">{formatPrice(day.total)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-sm" style={{ background: chartColors.services }} /> Turnos
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{formatPrice(day.services)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-sm" style={{ background: chartColors.shop }} /> Tienda
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {formatPrice(day.shop)} <span className="text-xs text-ink-soft">({day.orderCount} pedidos)</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
        {day[metric] > 0 && (
          <p className="text-ink-soft">
            Puesto <strong className="text-ink">#{rank}</strong> de {days.length} días por {metricLabels[metric].short.toLowerCase()}.
          </p>
        )}
        {lastWeek && diff !== null && (
          <div>
            <p className="text-ink-soft">
              Contra el {weekdayName(lastWeek.weekday)} anterior ({formatShortDate(lastWeek.date).split(" ")[1]})
            </p>
            <p className="mt-0.5 text-ink">
              {unit(lastWeek[metric])} →{" "}
              <strong style={{ color: diff > 0 ? chartColors.up : diff < 0 ? chartColors.down : undefined }}>
                {diff > 0 ? `▲ ${metric === "total" ? formatPrice(diff) : `+${diff}`}` : diff < 0 ? `▼ ${metric === "total" ? formatPrice(-diff) : diff}` : "= igual"}
              </strong>
            </p>
          </div>
        )}
      </div>

      {topServicesOfDay.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-ink-soft">Lo más pedido ese día</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {topServicesOfDay.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="truncate text-ink">{s.name}</span>
                <span className="shrink-0 text-ink-soft">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
