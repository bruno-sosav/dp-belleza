import { Link, useParams } from "react-router-dom"
import { getServiceById, services } from "../data/services"
import { formatPrice } from "../../ecommerce/lib/format"
import { formatDuration } from "../lib/format"
import DurationPill from "../components/DurationPill"
import SectionHeader from "../components/SectionHeader"
import ServiceCard from "../components/ServiceCard"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

export default function ServiceDetail() {
  const { id } = useParams()
  const service = id ? getServiceById(id) : undefined

  if (!service) {
    return (
      <div className={`${containerClass} py-24 text-center`}>
        <h1 className="font-display text-2xl text-ink">Servicio no encontrado</h1>
        <p className="mt-2 text-ink-soft">Puede que ya no esté disponible.</p>
        <Link to="/servicios" className={`${primaryButtonClass} mt-6`}>
          Ver todos los servicios
        </Link>
      </div>
    )
  }

  const related = services
    .filter((s) => s.category === service.category && s.id !== service.id)
    .slice(0, 3)

  return (
    <div className={`${containerClass} py-10`}>
      <p className="mb-8 text-xs uppercase tracking-wide text-ink-soft">
        <Link to="/" className="transition hover:text-rose-dark">
          Inicio
        </Link>{" "}
        /{" "}
        <Link to="/servicios" className="transition hover:text-rose-dark">
          Turnos
        </Link>{" "}
        / {service.name}
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden rounded-2xl bg-cream-dark">
          <img src={service.image} alt={service.name} className="aspect-[4/5] w-full object-cover" />
        </div>

        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-dark">{service.category}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {service.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <DurationPill minutes={service.durationMin} />
            {service.professional && (
              <span className="text-xs text-ink-soft">A cargo de {service.professional}</span>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-ink-soft">{service.description}</p>

          <div className="mt-8 flex items-end justify-between gap-6 border-y border-cream-dark py-5">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-soft/70">Precio por sesión</p>
              <p className="font-display text-3xl font-semibold text-ink">{formatPrice(service.price)}</p>
            </div>
            {service.recommendedSessions && service.recommendedSessions > 1 && (
              <p className="max-w-[10rem] text-right text-[11px] leading-relaxed text-ink-soft">
                Se recomiendan {service.recommendedSessions} sesiones para ver resultados sostenidos.
              </p>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-base font-semibold text-ink">Qué incluye la sesión</h2>
            <ul className="mt-4 space-y-2.5">
              {service.includes.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-ink-soft">
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-dark"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to={`/reservar/${service.id}`} className={`${primaryButtonClass} flex-1`}>
              Reservar turno
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link to="/servicios" className={secondaryButtonClass}>
              Ver otros servicios
            </Link>
          </div>

          <div className={`${cardClass} mt-6 bg-cream-dark/40`}>
            <ul className="space-y-2 text-xs leading-relaxed text-ink-soft">
              <li>✓ Reserva sin seña — abonás en el local al finalizar</li>
              <li>✓ Podés cancelar o reprogramar hasta 24 hs antes</li>
              <li>✓ El turno reserva {formatDuration(service.durationMin)} exclusivos para vos</li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeader eyebrow={service.category} title="Servicios relacionados" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ServiceCard key={item.id} service={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
