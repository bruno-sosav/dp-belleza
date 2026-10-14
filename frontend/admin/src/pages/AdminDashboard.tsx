import { useState } from "react"
import { Link } from "react-router-dom"
import { formatPrice } from "../../ecommerce/lib/format"
import { useAllProducts } from "../../ecommerce/data/productStore"
import { services } from "../../turnera/data/services"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import DayDetail from "../components/DayDetail"
import ColumnChart from "../components/charts/ColumnChart"
import CalendarHeatmap from "../components/charts/CalendarHeatmap"
import RankingList from "../components/charts/RankingList"
import { chartColors } from "../components/charts/theme"
import { daysInPeriod, previousPeriodDays, topProducts, topServices, totals } from "../lib/stats"
import { formatCompactPrice, formatDayMonth, formatShortDate } from "../lib/format"
import { usePeriod } from "../lib/usePeriod"

/** Pantalla principal del panel: cuánto se ganó, qué días estuvieron movidos y qué se vende más. */
export default function AdminDashboard() {
  const { period } = usePeriod()
  const products = useAllProducts()
  const [selected, setSelected] = useState<string | null>(null)

  const days = daysInPeriod(period)
  const now = totals(days)
  const before = totals(previousPeriodDays(period))
  const compareLabel = `vs los ${period} días anteriores`
  const selectedDay = days.find((d) => d.date === selected) ?? days[days.length - 1]

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id

  return (
    <div>
      <PageHeader title="Resumen" description="Cómo viene el negocio: ganancias de la tienda y de los turnos." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ganancia total" value={formatPrice(now.total)} current={now.total} previous={before.total} compareLabel={compareLabel} />
        <StatTile label="Turnos" value={formatPrice(now.services)} current={now.services} previous={before.services} compareLabel={compareLabel} accent={chartColors.services} />
        <StatTile label="Tienda" value={formatPrice(now.shop)} current={now.shop} previous={before.shop} compareLabel={compareLabel} accent={chartColors.shop} />
        <StatTile label="Turnos realizados" value={String(now.bookingCount)} current={now.bookingCount} previous={before.bookingCount} compareLabel={compareLabel} />
      </div>

      <Panel title="Ganancias por día" description="Pasá el mouse por una columna para ver el detalle." className="mt-6">
        <ColumnChart
          ariaLabel="Ganancias por día, turnos y tienda"
          data={days.map((d) => ({
            key: d.date,
            axisLabel: formatDayMonth(d.date),
            title: formatShortDate(d.date),
            values: { services: d.services, shop: d.shop },
          }))}
          series={[
            { key: "services", label: "Turnos", color: chartColors.services },
            { key: "shop", label: "Tienda", color: chartColors.shop },
          ]}
          formatValue={formatPrice}
          formatAxis={formatCompactPrice}
        />
      </Panel>

      <Panel title="¿Qué días estuvo movido?" description="Cuanto más rojo, más se ganó ese día. Tocá un día para ver el detalle." className="mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <CalendarHeatmap days={days} metric="total" selected={selectedDay.date} onSelect={setSelected} />
          <DayDetail day={selectedDay} days={days} metric="total" />
        </div>
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Productos más vendidos"
          action={<Link to="/admin/ventas" className="text-sm text-rose-dark hover:underline">Ver todos →</Link>}
        >
          <RankingList
            color={chartColors.shop}
            countLabel={(n) => `${n} u.`}
            items={topProducts(days).slice(0, 5).map((r) => ({ ...r, name: productName(r.id) }))}
          />
        </Panel>
        <Panel
          title="Servicios más pedidos"
          action={<Link to="/admin/turnos" className="text-sm text-rose-dark hover:underline">Ver todos →</Link>}
        >
          <RankingList
            color={chartColors.services}
            countLabel={(n) => `${n} turnos`}
            items={topServices(days).slice(0, 5).map((r) => ({ ...r, name: serviceName(r.id) }))}
          />
        </Panel>
      </div>
    </div>
  )
}
