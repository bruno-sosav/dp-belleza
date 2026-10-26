import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../../../shared/components/PageHeader"
import FinanzasTabs from "../../payments/components/FinanzasTabs"
import Panel from "../../../shared/components/Panel"
import StatTile from "../../../shared/components/StatTile"
import DiasMovidos from "../components/DiasMovidos"
import { Cargando, ErrorCarga, Pendiente } from "../../../shared/components/EstadoCarga"
import ColumnChart from "../../../shared/components/charts/ColumnChart"
import RankingList from "../../../shared/components/charts/RankingList"
import { chartColors } from "../../../shared/components/charts/theme"
import { daysInPeriod, previousPeriodDays, totals, weekdayAverages } from "../../../shared/lib/stats"
import { formatCompactPrice, formatDayMonth, formatShortDate, weekdayName, weekdayShort } from "../../../shared/lib/format"
import { usePeriod } from "../../../shared/lib/usePeriod"
import { useDias, useRankingServicios } from "../api/estadisticas.api"

const unDecimal = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 })
const descripcion = "Cómo viene el negocio: lo que se ganó, cuántos turnos hubo y qué se pide más."

/**
 * Finanzas → Análisis (/finanzas/analisis): todo lo que antes estaba en dos
 * pestañas (Ganancias y Turnos) en un solo panel, de arriba hacia abajo:
 * los números del período, la plata por día, qué días estuvo movido, qué días
 * de la semana son fuertes y qué se pide más.
 *
 * El filtro de período (7 / 30 / 90 días…) del encabezado afecta a todo.
 */
export default function AnalysisPage() {
  const { period } = usePeriod()
  const { datos, cargando, error, recargar } = useDias()
  const ranking = useRankingServicios(period)

  if (cargando) {
    return (
      <div>
        <PageHeader title="Finanzas" description={descripcion} action={<FinanzasTabs />} />
        <Panel>
          <Cargando alto="h-64" />
        </Panel>
      </div>
    )
  }
  if (error || !datos) {
    return (
      <div>
        <PageHeader title="Finanzas" action={<FinanzasTabs />} />
        <Panel>
          <ErrorCarga mensaje={error ?? "No se pudieron cargar las estadísticas."} onReintentar={recargar} alto="h-64" />
        </Panel>
      </div>
    )
  }

  const { dias: allDays, tiendaConectada } = datos
  const days = daysInPeriod(allDays, period)
  const prevDays = previousPeriodDays(allDays, period)
  const now = totals(days)
  const before = totals(prevDays)
  const compareLabel = `vs los ${period} días anteriores`
  const diasAbiertos = (lista: typeof days) => lista.filter((d) => d.weekday !== 0).length || 1
  const porDiaSemana = weekdayAverages(days, "bookingCount")
  const masFuerte = [...porDiaSemana].sort((a, b) => b.average - a.average)[0]

  return (
    <div>
      <PageHeader title="Finanzas" description={descripcion} action={<FinanzasTabs />} />

      {/* Plata */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Ganancia total" value={formatPrice(now.total)} current={now.total} previous={before.total} compareLabel={compareLabel} />
        <StatTile label="Por turnos" value={formatPrice(now.services)} current={now.services} previous={before.services} compareLabel={compareLabel} accent={chartColors.services} />
        {/* Mientras el módulo de ecommerce no sume su parte, acá iría un $0 que
            sería mentira: no es que no se vendió, es que todavía no se conectó. */}
        {tiendaConectada ? (
          <StatTile label="Por la tienda" value={formatPrice(now.shop)} current={now.shop} previous={before.shop} compareLabel={compareLabel} accent={chartColors.shop} />
        ) : (
          <StatTile label="Por la tienda" value="—" nota="Pendiente de conectar" accent={chartColors.shop} />
        )}
      </div>

      {/* Turnos */}
      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Turnos realizados" value={String(now.bookingCount)} current={now.bookingCount} previous={before.bookingCount} compareLabel={compareLabel} />
        <StatTile
          label="Promedio por día abierto"
          value={unDecimal(now.bookingCount / diasAbiertos(days))}
          current={now.bookingCount / diasAbiertos(days)}
          previous={before.bookingCount / diasAbiertos(prevDays)}
          compareLabel={compareLabel}
        />
        <StatTile label="Cancelados" value={String(now.cancelledCount)} current={now.cancelledCount} previous={before.cancelledCount} compareLabel={compareLabel} upIsGood={false} />
        <StatTile label="No vinieron" value={String(now.noShowCount)} current={now.noShowCount} previous={before.noShowCount} compareLabel={compareLabel} upIsGood={false} />
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

      <div className="mt-6">
        <DiasMovidos days={days} allDays={allDays} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Turnos por día de la semana"
          description={masFuerte && masFuerte.average > 0 ? `En promedio, el día más movido es el ${weekdayName(masFuerte.weekday)}.` : undefined}
        >
          <ColumnChart
            ariaLabel="Promedio de turnos por día de la semana"
            height={220}
            showValueLabels
            firstColumnLabel="Día"
            data={porDiaSemana.map((w) => ({
              key: String(w.weekday),
              axisLabel: weekdayShort[w.weekday],
              title: weekdayName(w.weekday),
              values: { average: w.average },
            }))}
            series={[{ key: "average", label: "Turnos promedio", color: chartColors.services }]}
            formatValue={(n) => `${unDecimal(n)} turnos`}
            formatAxis={unDecimal}
          />
        </Panel>

        <Panel title="Servicios más pedidos">
          {ranking.cargando ? (
            <Cargando />
          ) : ranking.error ? (
            <ErrorCarga mensaje={ranking.error} onReintentar={ranking.recargar} />
          ) : (
            <RankingList color={chartColors.services} countLabel={(n) => `${n} turnos`} items={ranking.datos ?? []} />
          )}
        </Panel>
      </div>

      <Panel title="Productos más vendidos" className="mt-6">
        <Pendiente>
          Pendiente: lo conecta el módulo de ecommerce,
          <br />
          desde <code>GET /api/admin/stats/productos</code>.
        </Pendiente>
      </Panel>
    </div>
  )
}
