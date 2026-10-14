import type { Service } from "../data/services"
import { formatPrice } from "../../ecommerce/lib/format"
import { formatDuration, formatLongDate, formatTime } from "../lib/format"

type Props = {
  service: Service
  date: Date | null
  time: string | null
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={`text-right font-medium ${muted ? "text-ink-soft/50" : "text-ink"}`}>{value}</span>
    </div>
  )
}

export default function BookingSummary({ service, date, time }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-dark bg-surface">
      <div className="flex items-center gap-3.5 border-b border-cream-dark p-5">
        <img
          src={service.image}
          alt={service.name}
          className="h-16 w-14 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-rose-dark">{service.category}</p>
          <h3 className="font-display text-base leading-tight text-ink">{service.name}</h3>
          {service.professional && (
            <p className="mt-0.5 text-xs text-ink-soft">con {service.professional}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <Row label="Duración" value={formatDuration(service.durationMin)} />
        <Row
          label="Día"
          value={date ? formatLongDate(date) : "A elegir"}
          muted={date === null}
        />
        <Row label="Horario" value={time ? formatTime(time) : "A elegir"} muted={time === null} />
      </div>

      <div className="border-t border-cream-dark bg-cream-dark/30 p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-display font-semibold text-ink">Total</span>
          <span className="font-display text-xl font-semibold text-ink">{formatPrice(service.price)}</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          Se abona en el local al finalizar la sesión. No se cobra seña.
        </p>
      </div>
    </div>
  )
}
