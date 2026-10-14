import { useState } from "react"
import { formatPrice } from "../../ecommerce/lib/format"
import { services } from "../../turnera/data/services"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import DayDetail from "../components/DayDetail"
import BusiestDays from "../components/BusiestDays"
import ColumnChart from "../components/charts/ColumnChart"
import CalendarHeatmap from "../components/charts/CalendarHeatmap"
import RankingList from "../components/charts/RankingList"
import { chartColors } from "../components/charts/theme"
import { daysInPeriod, previousPeriodDays, topServices, totals, weekdayAverages } from "../lib/stats"
import { weekdayName, weekdayShort } from "../lib/format"
import { usePeriod } from "../lib/usePeriod"

const oneDecimal = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 })

/** Estadísticas de la turnera: días movidos, días de la semana fuertes y servicios más pedidos. */
export default function AdminBookings() {
  const { period } = usePeriod()
  const [selected, setSelected] = useState<string | null>(null)

  const days = daysInPeriod(period)
  const prevDays = previousPeriodDays(period)
  const now = totals(days)
  const before = totals(prevDays)
  const compareLabel = `vs los ${period} días anteriores`
  const openDays = (list: typeof days) => list.filter((d) => d.weekday !== 0).length || 1
  const selectedDay = days.find((d) => d.date === selected) ?? days[days.length - 1]

  const byWeekday = weekdayAverages(days, "bookingCount")
  const strongest = [...byWeekday].sort((a, b) => b.average - a.average)[0]
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id

  return (
    <div>
      <PageHeader title="Turnos" description="Qué días hubo más movimiento y qué servicios se piden más." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Turnos realizados" value={String(now.bookingCount)} current={now.bookingCount} previous={before.bookingCount} compareLabel={compareLabel} />
        <StatTile label="Ganancia por turnos" value={formatPrice(now.services)} current={now.services} previous={before.services} compareLabel={compareLabel} accent={chartColors.services} />
        <StatTile
          label="Promedio por día abierto"
          value={oneDecimal(now.bookingCount / openDays(days))}
          current={now.bookingCount / openDays(days)}
          previous={before.bookingCount / openDays(prevDays)}
          compareLabel={compareLabel}
        />
        <StatTile label="Cancelados" value={String(now.cancelledCount)} current={now.cancelledCount} previous={before.cancelledCount} compareLabel={compareLabel} upIsGood={false} />
      </div>

      <Panel title="¿Qué días estuvo movido?" description="Cada cuadradito es un día: cuanto más rojo, más turnos hubo. Tocá uno para ver el detalle." className="mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <CalendarHeatmap days={days} metric="bookingCount" selected={selectedDay.date} onSelect={setSelected} />
            <h3 className="mt-8 text-sm font-medium text-ink">Los 5 días con más turnos</h3>
            <div className="mt-2">
              <BusiestDays days={days} metric="bookingCount" selected={selectedDay.date} onSelect={setSelected} />
            </div>
          </div>
          <DayDetail day={selectedDay} days={days} metric="bookingCount" />
        </div>
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Turnos por día de la semana"
          description={strongest && strongest.average > 0 ? `En promedio, el día más movido es el ${weekdayName(strongest.weekday)}.` : undefined}
        >
          <ColumnChart
            ariaLabel="Promedio de turnos por día de la semana"
            height={220}
            showValueLabels
            firstColumnLabel="Día"
            data={byWeekday.map((w) => ({
              key: String(w.weekday),
              axisLabel: weekdayShort[w.weekday],
              title: weekdayName(w.weekday),
              values: { average: w.average },
            }))}
            series={[{ key: "average", label: "Turnos promedio", color: chartColors.services }]}
            formatValue={(n) => `${oneDecimal(n)} turnos`}
            formatAxis={oneDecimal}
          />
        </Panel>

        <Panel title="Servicios más pedidos">
          <RankingList
            color={chartColors.services}
            countLabel={(n) => `${n} turnos`}
            items={topServices(days).map((r) => ({ ...r, name: serviceName(r.id) }))}
          />
        </Panel>
      </div>
    </div>
  )
}
