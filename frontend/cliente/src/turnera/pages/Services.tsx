import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ServiceCategory } from "../data/services"
import { serviceCategories, services } from "../data/services"
import CategoryTabs from "../components/CategoryTabs"
import SectionHeader from "../components/SectionHeader"
import ServiceCard from "../components/ServiceCard"
import { containerClass, primaryButtonClass } from "../lib/styles"

const steps = [
  {
    title: "Elegí tu servicio",
    desc: "Mirá el detalle, la duración y el precio de cada tratamiento.",
  },
  {
    title: "Reservá día y horario",
    desc: "Te mostramos solo los horarios que están libres en la agenda.",
  },
  {
    title: "Te confirmamos",
    desc: "Recibís la confirmación del turno por WhatsApp y un recordatorio.",
  },
]

export default function Services() {
  const [category, setCategory] = useState<ServiceCategory | null>(null)

  const filtered = useMemo(
    () => (category ? services.filter((s) => s.category === category) : services),
    [category]
  )

  return (
    <div>
      <section className="border-b border-cream-dark bg-cream-dark/50">
        <div className={`${containerClass} py-14 sm:py-20`}>
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-dark">Turnos online</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
              Reservá tu momento
              <br /> de cuidado
            </h1>
            <p className="mt-5 max-w-lg text-ink-soft">
              Tratamientos faciales, corporales y de estética integral a cargo de profesionales.
              Elegí el servicio, el día y el horario que mejor te queden — en menos de un minuto.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#servicios" className={primaryButtonClass}>
                Ver servicios
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 border-t border-ink/10 pt-8 sm:grid-cols-4">
            <div>
              <dt className="font-display text-2xl font-semibold text-ink">{services.length}</dt>
              <dd className="mt-0.5 text-xs text-ink-soft">Servicios</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-semibold text-ink">Lun a Sáb</dt>
              <dd className="mt-0.5 text-xs text-ink-soft">Atención</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-semibold text-ink">24 hs</dt>
              <dd className="mt-0.5 text-xs text-ink-soft">Para cancelar sin cargo</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-semibold text-ink">Sin seña</dt>
              <dd className="mt-0.5 text-xs text-ink-soft">Abonás en el local</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-cream-dark bg-cream">
        <div className={`${containerClass} py-12`}>
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose/25 font-display text-sm font-semibold text-rose-dark">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="servicios" className={`${containerClass} scroll-mt-24 py-16`}>
        <SectionHeader
          eyebrow="Catálogo"
          title="Nuestros servicios"
          description="Filtrá por categoría para encontrar el tratamiento que estás buscando."
        />

        <div className="mt-8">
          <CategoryTabs categories={serviceCategories} active={category} onChange={setCategory} />
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "servicio" : "servicios"}
          {category ? ` en ${category}` : ""}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      <section className="bg-ink py-16 text-cream">
        <div className={`${containerClass} text-center`}>
          <p className="text-xs uppercase tracking-[0.2em] text-rose">¿No sabés qué elegir?</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-2xl font-semibold sm:text-3xl">
            Escribinos y te recomendamos el tratamiento según tu piel y tus objetivos
          </h2>
          <Link
            to="/contacto"
            className="mt-8 inline-flex rounded-lg border border-cream/40 px-6 py-3 text-sm font-medium text-cream transition hover:bg-cream hover:text-ink"
          >
            Hablar con una profesional
          </Link>
        </div>
      </section>
    </div>
  )
}
