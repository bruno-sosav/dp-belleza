import { useState } from "react"
import { Link } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import DayDetail from "../components/DayDetail"
import { Cargando, ErrorCarga, Pendiente } from "../components/EstadoCarga"
import ColumnChart from "../components/charts/ColumnChart"
import CalendarHeatmap from "../components/charts/CalendarHeatmap"
import RankingList from "../components/charts/RankingList"
import { chartColors } from "../components/charts/theme"
import { daysInPeriod, previousPeriodDays, totals } from "../lib/stats"
import { formatCompactPrice, formatDayMonth, formatShortDate } from "../lib/format"
import { usePeriod } from "../lib/usePeriod"
import { useDias, useRankingServicios } from "../data/estadisticas"

/** Pantalla principal del panel: cuánto se ganó, qué días estuvieron movidos y qué se pide más. */
export default function AdminDashboard() {
  const { period } = usePeriod()
  const [selected, setSelected] = useState<string | null>(null)

  const { datos, cargando, error, recargar } = useDias()
  const ranking = useRankingServicios(period)

  if (cargando) return <PantallaCargando />
  if (error || !datos) {
    return (
      <div>
        <PageHeader title="Resumen" />
        <Panel>
          <ErrorCarga mensaje={error ?? "No se pudieron cargar las estadísticas."} onReintentar={recargar} alto="h-64" />
        </Panel>
      </div>
    )
  }

  const { dias: allDays, tiendaConectada } = datos
  const days = daysInPeriod(allDays, period)
  const now = totals(days)
  const before = totals(previousPeriodDays(allDays, period))
  const compareLabel = `vs los ${period} días anteriores`
  const selectedDay = days.find((d) => d.date === selected) ?? days[days.length - 1]

  return (
    <div>
      <PageHeader title="Resumen" description="Cómo viene el negocio: ganancias de la tienda y de los turnos." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ganancia total"
          value={formatPrice(now.total)}
          current={now.total}
          previous={before.total}
          compareLabel={compareLabel}
        />
        <StatTile
          label="Turnos"
          value={formatPrice(now.services)}
          current={now.services}
          previous={before.services}
          compareLabel={compareLabel}
          accent={chartColors.services}
        />
        {/* Mientras el módulo de ecommerce no sume su parte, acá iría un $0 que
            sería mentira: no es que no se vendió, es que todavía no se conectó. */}
        {tiendaConectada ? (
          <StatTile
            label="Tienda"
            value={formatPrice(now.shop)}
            current={now.shop}
            previous={before.shop}
            compareLabel={compareLabel}
            accent={chartColors.shop}
          />
        ) : (
          <StatTile label="Tienda" value="—" nota="Pendiente de conectar" accent={chartColors.shop} />
        )}
        <StatTile
          label="Turnos realizados"
          value={String(now.bookingCount)}
          current={now.bookingCount}
          previous={before.bookingCount}
          compareLabel={compareLabel}
        />
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
            ...(tiendaConectada ? [{ key: "shop", label: "Tienda", color: chartColors.shop }] : []),
          ]}
          formatValue={formatPrice}
          formatAxis={formatCompactPrice}
        />
      </Panel>

      <Panel title="¿Qué días estuvo movido?" description="Cuanto más rojo, más se ganó ese día. Tocá un día para ver el detalle." className="mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <CalendarHeatmap days={days} metric="total" selected={selectedDay.date} onSelect={setSelected} />
          <DayDetail day={selectedDay} days={days} allDays={allDays} metric="total" />
        </div>
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Productos más vendidos"
          action={<Link to="/ventas" className="text-sm text-rose-dark hover:underline">Ver todos →</Link>}
        >
          <Pendiente>
            Pendiente: lo conecta el módulo de ecommerce,
            <br />
            desde <code>GET /api/admin/stats/productos</code>.
          </Pendiente>
        </Panel>
        <Panel
          title="Servicios más pedidos"
          action={<Link to="/turnos" className="text-sm text-rose-dark hover:underline">Ver todos →</Link>}
        >
          {ranking.cargando ? (
            <Cargando />
          ) : ranking.error ? (
            <ErrorCarga mensaje={ranking.error} onReintentar={ranking.recargar} />
          ) : (
            <RankingList
              color={chartColors.services}
              countLabel={(n) => `${n} turnos`}
              items={(ranking.datos ?? []).slice(0, 5)}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}

function PantallaCargando() {
  return (
    <div>
      <PageHeader title="Resumen" description="Cómo viene el negocio: ganancias de la tienda y de los turnos." />
      <Panel>
        <Cargando alto="h-64" />
      </Panel>
    </div>
  )
}
