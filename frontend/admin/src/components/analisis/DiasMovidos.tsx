import { useState } from "react"
import Panel from "../../shared/components/Panel"
import DayDetail from "../DayDetail"
import BusiestDays from "../BusiestDays"
import CalendarHeatmap from "../../shared/components/charts/CalendarHeatmap"
import type { DayMetric, DayStats } from "../../shared/lib/stats"

const opciones: { metrica: DayMetric; label: string; descripcion: string }[] = [
  { metrica: "total", label: "💰 Por plata", descripcion: "Cuanto más rojo, más se ganó ese día." },
  { metrica: "bookingCount", label: "📅 Por turnos", descripcion: "Cuanto más rojo, más turnos hubo ese día." },
]

/**
 * "¿Qué días estuvo movido?": el calendario coloreado, los 5 días más fuertes
 * y el detalle del día elegido. Antes estaba dos veces (una en Ganancias por
 * plata, otra en Turnos por cantidad); ahora es uno solo con un selector.
 */
export default function DiasMovidos({ days, allDays }: { days: DayStats[]; allDays: DayStats[] }) {
  const [metrica, setMetrica] = useState<DayMetric>("total")
  const [elegido, setElegido] = useState<string | null>(null)
  const dia = days.find((d) => d.date === elegido) ?? days[days.length - 1]
  const opcion = opciones.find((o) => o.metrica === metrica)!

  if (!dia) return null

  return (
    <Panel
      title="¿Qué días estuvo movido?"
      description={`${opcion.descripcion} Tocá un día para ver el detalle.`}
      action={
        <div className="flex gap-1 rounded-xl bg-cream-dark p-1" role="radiogroup" aria-label="Ver los días">
          {opciones.map((o) => (
            <button
              key={o.metrica}
              type="button"
              role="radio"
              aria-checked={metrica === o.metrica}
              onClick={() => setMetrica(o.metrica)}
              className={`rounded-lg px-3 py-2 text-base transition ${metrica === o.metrica ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <CalendarHeatmap days={days} metric={metrica} selected={dia.date} onSelect={setElegido} />
          <h3 className="mt-8 text-sm font-medium text-ink">Los 5 días más fuertes</h3>
          <div className="mt-2">
            <BusiestDays days={days} metric={metrica} selected={dia.date} onSelect={setElegido} />
          </div>
        </div>
        <DayDetail day={dia} days={days} allDays={allDays} metric={metrica} />
      </div>
    </Panel>
  )
}
