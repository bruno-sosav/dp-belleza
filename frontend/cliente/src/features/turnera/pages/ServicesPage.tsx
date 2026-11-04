import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { categoriesOf } from "@dp/shared/lib/servicios"
import { describeOpenDays, useOpeningHours } from "../api/disponibilidad.api"
import { useServices } from "../api/servicios.api"
import { useNegocio } from "../../../shared/lib/negocio"
import { InlineError } from "../components/LoadState"
import CategoryTabs from "../components/CategoryTabs"
import SectionHeader from "../components/SectionHeader"
import ServiceCard from "../components/ServiceCard"
import { containerClass } from "../lib/styles"

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

export default function ServicesPage() {
  const services = useServices()
  const hours = useOpeningHours()
  const negocio = useNegocio()
  const [category, setCategory] = useState<string | null>(null)

  const all = useMemo(() => services.data ?? [], [services.data])
  const categories = useMemo(() => categoriesOf(all), [all])
  const filtered = useMemo(
    () => (category ? all.filter((s) => s.category === category) : all),
    [all, category]
  )

  return (
    <div>
      <section className="bg-forest text-cream">
        <div className={`${containerClass} py-16 sm:py-24`}>
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.34em] text-sand before:h-px before:w-9 before:bg-sand before:opacity-70">
              Turnos online
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4.2rem)] font-medium leading-[1.05] text-white">
              Reservá tu momento
              <br /> <em className="font-normal italic text-rose">de cuidado</em>
            </h1>
            <p className="mt-6 max-w-lg text-[1.02rem] font-light leading-relaxed text-white/80">
              Tratamientos faciales, corporales y de estética integral a cargo de profesionales.
              Elegí el servicio, el día y el horario que mejor te queden — en menos de un minuto.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#servicios"
                className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-sm bg-cream px-8 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink transition hover:-translate-y-0.5 hover:bg-white"
              >
                Ver servicios
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 border-t border-white/15 pt-8 sm:grid-cols-4">
            <div>
              <dt className="font-display text-3xl font-medium text-white">{services.data ? all.length : "—"}</dt>
              <dd className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/60">Servicios</dd>
            </div>
            <div>
              <dt className="font-display text-3xl font-medium text-white">
                {hours.data ? describeOpenDays(hours.data) : "—"}
              </dt>
              <dd className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/60">Atención</dd>
            </div>
            <div>
              <dt className="font-display text-3xl font-medium text-white">
                {negocio ? (negocio.cancelacionHoras ? `${negocio.cancelacionHoras} hs` : "Hasta el turno") : "—"}
              </dt>
              <dd className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/60">Para cancelar desde la web</dd>
            </div>
            <div>
              <dt className="font-display text-3xl font-medium text-white">Sin seña</dt>
              <dd className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/60">Abonás en el local</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-cream-dark">
        <div className={`${containerClass} py-12`}>
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="shrink-0 font-display text-4xl font-medium leading-none text-leaf/30">0{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm font-light leading-relaxed text-ink-soft">{step.desc}</p>
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

        {services.error ? (
          <div className="mt-8">
            <InlineError message={services.error} onRetry={services.reload} />
          </div>
        ) : services.loading && !services.data ? (
          <p className="mt-8 text-sm text-ink-soft">Cargando servicios…</p>
        ) : (
          <>
            {categories.length > 1 && (
              <div className="mt-8">
                <CategoryTabs categories={categories} active={category} onChange={setCategory} />
              </div>
            )}

            <p className="mt-6 text-sm text-ink-soft">
              {filtered.length} {filtered.length === 1 ? "servicio" : "servicios"}
              {category ? ` en ${category}` : ""}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="bg-forest py-20 text-cream">
        <div className={`${containerClass} text-center`}>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em] text-rose">¿No sabés qué elegir?</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-tight">
            Escribinos y te recomendamos el tratamiento según tu piel y tus objetivos
          </h2>
          <Link
            to="/contacto"
            className="mt-9 inline-flex min-h-[54px] items-center rounded-sm border border-white/40 px-8 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-white transition hover:border-white hover:bg-white/10"
          >
            Hablar con una profesional
          </Link>
        </div>
      </section>
    </div>
  )
}
