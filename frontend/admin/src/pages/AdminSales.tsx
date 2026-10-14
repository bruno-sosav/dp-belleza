import { formatPrice } from "../../ecommerce/lib/format"
import { useAllProducts } from "../../ecommerce/data/productStore"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import ColumnChart from "../components/charts/ColumnChart"
import RankingList from "../components/charts/RankingList"
import { chartColors } from "../components/charts/theme"
import { daysInPeriod, previousPeriodDays, topProducts, totals } from "../lib/stats"
import { formatCompactPrice, formatDayMonth, formatShortDate } from "../lib/format"
import { usePeriod } from "../lib/usePeriod"

/** Estadísticas de la tienda online: ventas por día y productos más vendidos. */
export default function AdminSales() {
  const { period } = usePeriod()
  const products = useAllProducts()

  const days = daysInPeriod(period)
  const prevDays = previousPeriodDays(period)
  const now = totals(days)
  const before = totals(prevDays)
  const compareLabel = `vs los ${period} días anteriores`

  const ranking = topProducts(days)
  const units = ranking.reduce((acc, r) => acc + r.count, 0)
  const unitsBefore = topProducts(prevDays).reduce((acc, r) => acc + r.count, 0)
  const avgTicket = now.orderCount ? now.shop / now.orderCount : 0
  const avgTicketBefore = before.orderCount ? before.shop / before.orderCount : 0

  const soldIds = new Set(ranking.map((r) => r.id))
  const withoutSales = products.filter((p) => p.active && !soldIds.has(p.id))

  return (
    <div>
      <PageHeader title="Ventas de la tienda" description="Cuánto se vendió online y qué productos salen más." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ventas" value={formatPrice(now.shop)} current={now.shop} previous={before.shop} compareLabel={compareLabel} accent={chartColors.shop} />
        <StatTile label="Pedidos" value={String(now.orderCount)} current={now.orderCount} previous={before.orderCount} compareLabel={compareLabel} />
        <StatTile label="Unidades vendidas" value={String(units)} current={units} previous={unitsBefore} compareLabel={compareLabel} />
        <StatTile label="Ticket promedio" value={formatPrice(Math.round(avgTicket))} current={avgTicket} previous={avgTicketBefore} compareLabel={compareLabel} />
      </div>

      <Panel title="Ventas por día" description="Pasá el mouse por una columna para ver el detalle." className="mt-6">
        <ColumnChart
          ariaLabel="Ventas de la tienda por día"
          data={days.map((d) => ({
            key: d.date,
            axisLabel: formatDayMonth(d.date),
            title: formatShortDate(d.date),
            values: { shop: d.shop },
          }))}
          series={[{ key: "shop", label: "Tienda", color: chartColors.shop }]}
          formatValue={formatPrice}
          formatAxis={formatCompactPrice}
        />
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Productos más vendidos" description="Ordenados por unidades vendidas en el período.">
          <RankingList
            color={chartColors.shop}
            countLabel={(n) => `${n} u.`}
            items={ranking.map((r) => {
              const product = products.find((p) => p.id === r.id)
              return { ...r, name: product?.name ?? r.id, inactive: product ? !product.active : false }
            })}
          />
        </Panel>

        <Panel title="Sin ventas" description="Productos activos que no se vendieron en el período.">
          {withoutSales.length === 0 ? (
            <p className="text-sm text-ink-soft">Todos los productos tuvieron al menos una venta.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {withoutSales.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <img src={p.image} alt="" className="h-9 w-8 rounded object-cover" />
                  <span className="truncate text-ink">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
