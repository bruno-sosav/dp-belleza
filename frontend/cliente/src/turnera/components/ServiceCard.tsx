import { Link } from "react-router-dom"
import type { Service } from "../data/services"
import { formatPrice } from "../../ecommerce/lib/format"
import DurationPill from "./DurationPill"

const badgeStyles: Record<string, string> = {
  Nuevo: "bg-ink text-cream",
  "Más elegido": "bg-rose text-white",
  Promo: "bg-cream-dark text-ink",
}

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-cream-dark bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(34,38,31,0.35)]">
      <Link to={`/servicios/${service.id}`} className="relative block overflow-hidden bg-cream-dark">
        <img
          src={service.image}
          alt={service.name}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />

        {service.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${badgeStyles[service.badge]}`}
          >
            {service.badge}
          </span>
        )}

        <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft backdrop-blur-sm">
          {service.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/servicios/${service.id}`}>
          <h3 className="font-display text-lg leading-snug text-ink transition group-hover:text-rose-dark">
            {service.name}
          </h3>
        </Link>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{service.shortDescription}</p>

        <div className="mt-4 flex items-center gap-2">
          <DurationPill minutes={service.durationMin} />
          {service.professional && (
            <span className="truncate text-[11px] text-ink-soft/80">con {service.professional}</span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-cream-dark pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft/70">Desde</p>
            <p className="font-display text-xl font-semibold text-ink">{formatPrice(service.price)}</p>
          </div>

          <Link
            to={`/reservar/${service.id}`}
            className="rounded-lg bg-ink px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-cream transition hover:bg-rose-dark"
          >
            Reservar
          </Link>
        </div>
      </div>
    </article>
  )
}
