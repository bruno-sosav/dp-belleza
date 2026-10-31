import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import StatTile from "../../../shared/components/StatTile"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import ColumnChart from "../../../shared/components/charts/ColumnChart"
import RankingList from "../../../shared/components/charts/RankingList"
import { chartColors } from "../../../shared/components/charts/theme"
import { daysInPeriod, previousPeriodDays, totals } from "../../../shared/lib/stats"
import { formatCompactPrice, formatDayMonth, formatShortDate } from "../../../shared/lib/format"
import { usePeriod } from "../../../shared/lib/usePeriod"
import { useDias, useRankingProductos, type RankingApi } from "../../analytics/api/estadisticas.api"
import SinVentas from "../components/SinVentas"

const titulo = "Ventas tienda"
const descripcion = "Cuánto se vendió online y qué productos salen más. Cuentan los pedidos confirmados y entregados."

const unidades = (ranking: RankingApi[]) => ranking.reduce((acc, r) => acc + r.count, 0)

/** Ventas de la tienda: plata por día, pedidos, unidades, ticket promedio y ranking de productos. Todo sale de SQL. */
export default function SalesPage() {
  const { period } = usePeriod()
  const serie = useDias()
  const ranking = useRankingProductos(period)
  // El período anterior se saca restando: lo vendido en el doble de días menos lo de este período.
  const rankingDoble = useRankingProductos(period * 2)

  if (serie.cargando && !serie.datos) {
    return (
      <div>
        <PageHeader title={titulo} description={descripcion} />
        <Panel>
          <Cargando alto="h-64" />
        </Panel>
      </div>
    )
  }
  if (serie.error || !serie.datos) {
    return (
      <div>
        <PageHeader title={titulo} description={descripcion} />
        <Panel>
          <ErrorCarga mensaje={serie.error ?? "No se pudieron cargar las ventas."} onReintentar={serie.recargar} alto="h-64" />
        </Panel>
      </div>
    )
  }

  const days = daysInPeriod(serie.datos.dias, period)
  const now = totals(days)
  const before = totals(previousPeriodDays(serie.datos.dias, period))
  const compareLabel = `vs los ${period} días anteriores`

  const vendidos = ranking.datos ?? []
  const units = unidades(vendidos)
  const unitsBefore = rankingDoble.datos ? unidades(rankingDoble.datos) - units : undefined
  const avgTicket = now.orderCount ? now.shop / now.orderCount : 0
  const avgTicketBefore = before.orderCount ? before.shop / before.orderCount : 0

  return (
    <div>
      <PageHeader title={titulo} description={descripcion} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ventas" value={formatPrice(now.shop)} current={now.shop} previous={before.shop} compareLabel={compareLabel} accent={chartColors.shop} />
        <StatTile label="Pedidos" value={String(now.orderCount)} current={now.orderCount} previous={before.orderCount} compareLabel={compareLabel} />
        {ranking.datos ? (
          <StatTile label="Unidades vendidas" value={String(units)} current={units} previous={unitsBefore} compareLabel={compareLabel} />
        ) : (
          <StatTile label="Unidades vendidas" value="—" nota={ranking.error ? "No se pudo cargar" : "Cargando…"} />
        )}
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
          {ranking.cargando ? (
            <Cargando />
          ) : ranking.error ? (
            <ErrorCarga mensaje={ranking.error} onReintentar={ranking.recargar} />
          ) : (
            <RankingList color={chartColors.shop} countLabel={(n) => `${n} u.`} items={vendidos} />
          )}
        </Panel>

        <SinVentas vendidos={ranking.error ? [] : ranking.datos} />
      </div>
    </div>
  )
}
