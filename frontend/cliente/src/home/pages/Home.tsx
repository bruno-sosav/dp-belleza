import { Link } from "react-router-dom"
import { useProducts } from "../../ecommerce/data/productStore"
import ProductCard from "../../ecommerce/components/ProductCard"
import { services } from "../../turnera/data/services"
import ServiceCard from "../../turnera/components/ServiceCard"
import { about, bookingSteps, contactInfo, pillars, stats, testimonials } from "../data/content"

const containerClass = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p className={`text-xs uppercase tracking-[0.2em] ${light ? "text-rose" : "text-rose-dark"}`}>{children}</p>
  )
}

export default function Landing() {
  const products = useProducts()
  const featuredServices = services.filter((s) => s.badge).slice(0, 3)
  // Primero los Bestseller; si no llegan a 4, se completa con los mejor calificados.
  const bestsellers = [...products]
    .sort((a, b) => Number(b.badge === "Bestseller") - Number(a.badge === "Bestseller") || b.rating - a.rating)
    .slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream-dark">
        <div className={`${containerClass} grid grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2 lg:py-28`}>
          <div className="order-2 lg:order-1">
            <Eyebrow>Estética & cosmética</Eyebrow>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              Tu momento de cuidado,
              <br /> en cabina y en casa
            </h1>
            <p className="mt-5 max-w-md text-ink-soft">
              En Dp.belleza reservás tus tratamientos de estética online y comprás los productos para
              seguir cuidándote todos los días. Todo en un mismo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/servicios"
                className="rounded-md bg-ink px-7 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
              >
                Reservar turno
              </Link>
              <Link
                to="/tienda"
                className="rounded-md border border-ink px-7 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"
              >
                Comprar productos
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-ink/10 pt-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="font-display text-2xl font-semibold text-ink">{s.value}</dt>
                  <dd className="mt-0.5 text-xs text-ink-soft">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="order-1 lg:order-2">
            <img
              src="https://picsum.photos/seed/landing-hero/900/1000"
              alt="Tratamiento de estética en Dp.belleza"
              className="aspect-[4/5] w-full rounded-2xl object-cover shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Los dos servicios de la marca */}
      <section className={`${containerClass} py-16 lg:py-24`}>
        <div className="text-center">
          <Eyebrow>Qué hacemos</Eyebrow>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Todo Dp.belleza en un lugar</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {pillars.map((p) => (
            <article key={p.title} className="flex flex-col overflow-hidden rounded-2xl border border-cream-dark bg-surface">
              <img src={p.image} alt={p.title} loading="lazy" className="aspect-[16/10] w-full object-cover" />
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <Eyebrow>{p.eyebrow}</Eyebrow>
                <h3 className="mt-2 font-display text-2xl font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.description}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-ink">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-rose-dark" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 12l5 5L19 7" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.cta.to}
                  className="mt-8 self-start rounded-md bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
                >
                  {p.cta.label}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Cómo reservar */}
      <section className="bg-cream-dark/50 py-16 lg:py-20">
        <div className={containerClass}>
          <div className="text-center">
            <Eyebrow>Turnos online</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Reservá en 3 pasos</h2>
          </div>
          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {bookingSteps.map((step, i) => (
              <li key={step.title} className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose font-display text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Servicios destacados (turnera) */}
      <section className={`${containerClass} py-16 lg:py-20`}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Eyebrow>Estética</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Tratamientos destacados</h2>
          </div>
          <Link to="/servicios" className="shrink-0 text-sm font-medium text-rose-dark hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredServices.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </section>

      {/* Productos más vendidos (ecommerce) */}
      <section className="bg-cream-dark/50 py-16 lg:py-20">
        <div className={containerClass}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Tienda</Eyebrow>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Más vendidos</h2>
            </div>
            <Link to="/tienda" className="shrink-0 text-sm font-medium text-rose-dark hover:underline">
              Ver tienda →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="nosotros" className={`${containerClass} scroll-mt-24 py-16 lg:py-24`}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <img
            src={about.image}
            alt="El equipo de Dp.belleza"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-2xl object-cover lg:aspect-[4/5]"
          />
          <div>
            <Eyebrow>Nosotros</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Nuestra historia</h2>
            {about.paragraphs.map((text) => (
              <p key={text.slice(0, 20)} className="mt-4 leading-relaxed text-ink-soft">
                {text}
              </p>
            ))}
            <dl className="mt-10 grid grid-cols-1 gap-6 border-t border-ink/10 pt-8 sm:grid-cols-3">
              {about.values.map((v) => (
                <div key={v.title}>
                  <dt className="font-display text-lg font-semibold text-ink">{v.title}</dt>
                  <dd className="mt-1 text-sm text-ink-soft">{v.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="bg-ink py-16 text-cream lg:py-20">
        <div className={containerClass}>
          <div className="mb-10 text-center">
            <Eyebrow light>Testimonios</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Lo que dicen nuestras clientas</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.author} className="rounded-xl border border-cream/10 bg-cream/5 p-6">
                <div className="flex text-rose" aria-label={`${t.rating} de 5 estrellas`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5"
                      fill={i < t.rating ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={i < t.rating ? 0 : 1.2}
                    >
                      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6L10 14.9 4.6 17.8l1.3-6-4.6-4.1 6.1-.6L10 1.5z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-cream/80">“{t.quote}”</blockquote>
                <figcaption className="mt-4 font-display text-sm font-medium text-cream">{t.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Visitanos */}
      <section className={`${containerClass} py-16 lg:py-24`}>
        <div className="grid grid-cols-1 items-center gap-10 rounded-2xl bg-rose/25 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Visitanos</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">Te esperamos en el local</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Vení a conocer el espacio, pedí asesoramiento sobre productos o reservá tu próximo tratamiento.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/servicios"
                className="rounded-md bg-ink px-7 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
              >
                Reservar turno
              </Link>
              <Link
                to="/contacto"
                className="rounded-md border border-ink px-7 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"
              >
                Escribinos
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { label: "Dirección", value: contactInfo.address },
              { label: "Horario", value: contactInfo.hours },
              { label: "Email", value: contactInfo.email },
              { label: "Teléfono", value: contactInfo.phone },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-display text-sm font-semibold uppercase tracking-wide text-ink">{item.label}</dt>
                <dd className="mt-1 text-sm text-ink-soft">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
