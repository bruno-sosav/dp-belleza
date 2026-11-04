import { Link } from "react-router-dom"
import type { Service } from "@dp/shared/types/servicio.types"
import { formatPrice } from "@dp/shared/lib/format"
import DurationPill from "./DurationPill"
import ServiceImage from "./ServiceImage"

const badgeStyles: Record<string, string> = {
  Nuevo: "bg-forest text-cream",
  "Más elegido": "bg-rose text-forest",
  Promo: "bg-cream text-ink",
}

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded border border-ink/10 bg-surface transition duration-500 ease-soft hover:-translate-y-1.5 hover:border-leaf/30 hover:shadow-[0_24px_48px_rgba(34,38,31,0.10)]">
      <Link to={`/servicios/${service.id}`} className="relative block overflow-hidden bg-cream-dark">
        <ServiceImage
          service={service}
          loading="lazy"
          className="aspect-[5/4] w-full transition duration-700 ease-soft group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-55% to-[rgba(24,36,22,0.4)]" />

        {service.badge && (
          <span
            className={`absolute left-4 top-4 rounded-sm px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${badgeStyles[service.badge]}`}
          >
            {service.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-6 pt-6 pb-7">
        <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-bark">{service.category}</p>
        <Link to={`/servicios/${service.id}`}>
          <h3 className="mb-3 font-display text-[1.7rem] font-medium leading-[1.05] text-ink">{service.name}</h3>
        </Link>

        <p className="flex-1 text-sm font-light leading-relaxed text-ink-soft">{service.shortDescription}</p>

        <div className="mt-4 flex items-center gap-2">
          <DurationPill minutes={service.durationMin} />
          {service.professional && (
            <span className="truncate text-[11px] text-ink-soft/80">con {service.professional}</span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink/10 pt-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-soft/70">Desde</p>
            <p className="font-display text-2xl font-semibold text-ink">{formatPrice(service.price)}</p>
          </div>

          <Link
            to={`/reservar/${service.id}`}
            className="inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-leaf transition hover:text-forest"
          >
            Reservar
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  )
}
