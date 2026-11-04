import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { useProductos } from "../../ecommerce/api/catalogo.api"
import ProductCard from "../../ecommerce/components/ProductCard"
import { useServices } from "../../turnera/api/servicios.api"
import ServiceCard from "../../turnera/components/ServiceCard"
import { about, bookingSteps, brands, gallery, heroImages, reasons } from "../data/content"
import PhotoCarousel from "../components/PhotoCarousel"
import { datosDeContacto, useNegocio } from "../../../shared/lib/negocio"

const containerClass = "mx-auto max-w-6xl px-5 sm:px-6"
const sectionClass = `${containerClass} py-16 sm:py-24`

// Botones: claro sobre fotos oscuras, contorno blanco como secundario, y oliva profundo sobre fondo claro.
const buttonBase =
  "group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-sm px-9 text-[0.72rem] uppercase tracking-[0.2em] transition duration-300"
const lightButtonClass = `${buttonBase} bg-surface font-semibold text-ink hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)]`
const ghostButtonClass = `${buttonBase} border border-white/40 font-medium text-white hover:border-white hover:bg-white/10`
const darkButtonClass = `${buttonBase} bg-forest font-semibold text-cream hover:-translate-y-0.5 hover:bg-forest-soft`

/** Velo oliva oscuro sobre las fotos de fondo, para que el texto blanco se lea. */
const photoOverlay =
  "linear-gradient(180deg, rgba(36,40,24,0.74) 0%, rgba(36,40,24,0.55) 35%, rgba(36,40,24,0.86) 100%), radial-gradient(ellipse at 70% 20%, rgba(112,121,80,0.35), transparent 60%)"

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 transition-transform duration-300 ease-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  )
}

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={`mb-5 inline-flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.3em] before:h-px before:w-7 before:bg-current before:opacity-60 ${
        light ? "text-sand" : "text-bark"
      }`}
    >
      {children}
    </p>
  )
}

/** Título de sección. Lo que va en <em> sale en cursiva oliva, como acento. */
function Heading({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <h2
      className={`font-display text-[clamp(2.2rem,5vw,3.4rem)] font-medium leading-[1.08] tracking-[-0.01em] [&_em]:font-normal [&_em]:italic ${
        light ? "text-white [&_em]:text-rose" : "text-ink [&_em]:text-olive"
      }`}
    >
      {children}
    </h2>
  )
}

export default function HomePage() {
  const negocio = useNegocio()
  // Los destacados son los que tienen etiqueta (Nuevo, Más elegido, Promo); si no
  // hay, se muestran los primeros. Si la API no responde, la sección se oculta.
  const allServices = useServices().data ?? []
  const featured = allServices.filter((s) => s.badge)
  const services = (featured.length ? featured : allServices).slice(0, 3)
  // Cuatro productos con stock. Si la API no responde, se ve igual la presentación de la tienda.
  const destacados = (useProductos().data ?? []).filter((p) => p.disponible).slice(0, 4)
  const contacto = datosDeContacto(negocio)

  return (
    <div>
      {/* Cada sección dice con data-nav qué link del menú se marca mientras se la ve. */}
      {/* Hero: foto del consultorio a pantalla completa con velo oliva, el menú flota encima */}
      <section data-nav="/" className="relative flex min-h-svh items-center overflow-hidden bg-forest px-5 pt-36 pb-24 sm:px-6">
        <div
          className="dp-zoom absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `${photoOverlay}, url(${heroImages.background})` }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p
              className="dp-fade mb-7 inline-flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.34em] text-sand before:h-px before:w-9 before:bg-sand before:opacity-70"
              style={{ animationDelay: "0.1s" }}
            >
              Consultorio de estética
            </p>
            <h1 className="dp-fade mb-7" style={{ animationDelay: "0.2s" }}>
              <img
                src="/logo/logo-circulo.png"
                alt=""
                className="mb-6 h-20 w-20 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:h-24 sm:w-24"
              />
              <span className="block font-brand text-[clamp(2.6rem,7vw,5rem)] leading-[1] tracking-[0.005em] text-white">
                dppuntobelleza
              </span>
              <span className="mt-4 block font-brand text-[clamp(0.85rem,1.8vw,1.05rem)] tracking-[0.24em] text-sand">
                estética & bienestar
              </span>
            </h1>
            <p
              className="dp-fade mb-10 max-w-md text-lg leading-relaxed text-white/80"
              style={{ animationDelay: "0.35s" }}
            >
              Un lugar de confianza, dedicación y cuidado. Tratamientos personalizados en el consultorio y
              productos para acompañar tu piel en casa.
            </p>
            <div className="dp-fade flex flex-col gap-3.5 sm:flex-row" style={{ animationDelay: "0.5s" }}>
              <Link to="/servicios" className={lightButtonClass}>
                Reservar turno <Arrow />
              </Link>
              <Link to="/tienda" className={ghostButtonClass}>
                Ver productos
              </Link>
            </div>
          </div>

          <div className="dp-fade hidden lg:block" style={{ animationDelay: "0.45s" }}>
            <img
              src={heroImages.arch}
              alt="Tratamiento facial en el consultorio de dppuntobelleza"
              className="aspect-[4/5] w-full rounded-t-[160px] rounded-b-md border border-white/30 object-cover shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>

        <a
          href="#nosotros"
          className="dp-fade absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[0.58rem] uppercase tracking-[0.28em] text-white/60 transition hover:text-white"
          style={{ animationDelay: "0.9s" }}
        >
          Descubrí
          <span className="dp-scroll-line h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />
        </a>
      </section>

      {/* Nosotros: la historia de la dueña, con su texto */}
      <section id="nosotros" data-nav="/#nosotros" className={`${sectionClass} grid scroll-mt-24 items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div className="relative max-w-md lg:max-w-none">
          <img
            src={about.image}
            alt="Daniela, profesional a cargo de dppuntobelleza"
            loading="lazy"
            className="aspect-[4/5] w-full rounded object-cover object-top"
          />
          <div className="absolute -bottom-px -left-px rounded-tr-lg bg-cream px-7 pt-5 pb-4">
            <p className="font-display text-[2.6rem] font-medium leading-none text-olive">{about.since.value}</p>
            <p className="mt-1.5 text-[0.64rem] uppercase tracking-[0.18em] text-ink-soft">{about.since.label}</p>
          </div>
        </div>
        <div>
          <Eyebrow>{about.title}</Eyebrow>
          <Heading>
            Una pasión que se convirtió en <em>mi profesión.</em>
          </Heading>
          {about.intro.map((text) => (
            <p key={text.slice(0, 20)} className="mt-6 text-[1.04rem] font-light leading-[1.85] text-ink-soft">
              {text}
            </p>
          ))}

          <ul className="mt-7 flex flex-wrap gap-2">
            {about.titles.map((t) => (
              <li
                key={t}
                className="rounded-full border border-olive/30 px-3.5 py-1.5 text-[0.7rem] font-medium tracking-wide text-leaf"
              >
                {t}
              </li>
            ))}
          </ul>

          <details className="group mt-7">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-leaf transition hover:text-forest [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Leer la historia completa</span>
              <span className="hidden group-open:inline">Leer menos</span>
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">
                ↓
              </span>
            </summary>
            {about.more.map((text) => (
              <p key={text.slice(0, 20)} className="mt-5 text-[1rem] font-light leading-[1.85] text-ink-soft">
                {text}
              </p>
            ))}
          </details>
        </div>
      </section>

      {/* Por qué elegirnos */}
      <section data-nav="/#nosotros" className="bg-cream-dark">
        <div className={sectionClass}>
          <Eyebrow>La experiencia dppuntobelleza</Eyebrow>
          <Heading>
            Por qué <em>elegirnos</em>
          </Heading>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {reasons.map((r, i) => (
              <div key={r.title} className="border-t border-ink/15 pt-5">
                <span className="mb-3.5 block font-display text-lg tracking-[0.1em] text-bark">0{i + 1}</span>
                <h3 className="mb-2 font-semibold text-ink">{r.title}</h3>
                <p className="text-sm font-light leading-relaxed text-ink-soft">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* El consultorio */}
      <section data-nav="/#nosotros" className="py-16 sm:py-24">
        <div className={`${containerClass} mb-12 flex flex-wrap items-end justify-between gap-8`}>
          <div>
            <Eyebrow>El consultorio</Eyebrow>
            <Heading>
              Un espacio pensado <em>para tu bienestar</em>
            </Heading>
          </div>
          <p className="max-w-sm text-[1.02rem] font-light leading-[1.75] text-ink-soft">
            Un ambiente sereno y cuidado, para que cada visita sea un momento para vos.
          </p>
        </div>
        {/* La tira va fuera del contenedor para cruzar la pantalla de borde a borde. */}
        <PhotoCarousel photos={gallery} />
      </section>

      {/* Servicios destacados (turnera) */}
      {services.length > 0 && (
        <section data-nav="/servicios" className="bg-cream-dark">
          <div className={sectionClass}>
            <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
              <div>
                <Eyebrow>Tratamientos</Eyebrow>
                <Heading>
                  Todo para <em>vos</em>
                </Heading>
                <p className="mt-4 max-w-md text-[1.02rem] font-light leading-[1.75] text-ink-soft">
                  Estética facial y corporal, linfoterapia y masajes, con un enfoque personalizado para cada piel.
                </p>
              </div>
              <Link to="/servicios" className={darkButtonClass}>
                Ver todos <Arrow />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cómo reservar */}
      <section data-nav="/servicios" className={sectionClass}>
        <Eyebrow>Reservar es simple</Eyebrow>
        <Heading>
          Cómo <em>funciona</em>
        </Heading>
        <ol className="mt-12 grid grid-cols-1 gap-9 sm:grid-cols-3 sm:gap-10">
          {bookingSteps.map((step, i) => (
            <li key={step.title}>
              <span className="mb-3.5 block font-display text-[2.6rem] font-medium leading-none text-olive/35">
                0{i + 1}
              </span>
              <h3 className="mb-2 text-[1.05rem] font-semibold text-ink">{step.title}</h3>
              <p className="text-[0.92rem] font-light leading-relaxed text-ink-soft">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tienda: cuidado domiciliario */}
      <section data-nav="/tienda" className="bg-cream-dark">
        <div className={sectionClass}>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>Cuidado domiciliario</Eyebrow>
              <Heading>
                Acompañá tu piel <em>también en casa</em>
              </Heading>
              <p className="mt-6 max-w-md text-[1.04rem] font-light leading-[1.85] text-ink-soft">
                Una selección de productos para continuar el cuidado después de cada tratamiento. Te asesoramos para
                que elijas lo que tu piel necesita.
              </p>
              <ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink/10 pt-6">
                {brands.map((b) => (
                  <li key={b} className="font-brand text-sm uppercase tracking-[0.24em] text-ink-soft">
                    {b}
                  </li>
                ))}
              </ul>
              <Link to="/tienda" className={`${darkButtonClass} mt-10`}>
                Ver productos <Arrow />
              </Link>
            </div>
            <img
              src="/fotos/consultorio/productos-estante.jpg"
              alt="Productos de Carthage, Lidherma y Mary Kay en el consultorio"
              loading="lazy"
              className="aspect-[4/5] w-full max-w-md rounded-t-[140px] rounded-b-md object-cover lg:ml-auto"
            />
          </div>

          {destacados.length > 0 && (
            <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {destacados.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cierre: invitación a reservar */}
      <section data-nav="/contacto" className="relative overflow-hidden bg-forest">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(36,40,24,0.80), rgba(36,40,24,0.90)), url(${heroImages.cta})`,
          }}
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center sm:py-28">
          <p className="mb-7 inline-flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.34em] text-sand before:h-px before:w-9 before:bg-sand before:opacity-70">
            Reservá tu turno
          </p>
          <h2 className="mb-5 font-display text-[clamp(2.4rem,6vw,4rem)] font-medium leading-[1.05] text-white">
            Tu momento <em className="font-normal italic text-rose">te espera</em>
          </h2>
          <p className="mb-10 max-w-md text-[1.02rem] font-light leading-relaxed text-white/80">
            Date el cuidado que merecés. Reservá online en minutos y dejá el resto en nuestras manos.
          </p>
          <Link to="/servicios" className={lightButtonClass}>
            Reservar ahora <Arrow />
          </Link>

          {contacto.length > 0 && (
            <dl className="mt-14 grid w-full grid-cols-1 gap-6 border-t border-white/15 pt-8 text-left sm:grid-cols-2">
              {contacto.map((item) => (
                <div key={item.label}>
                  <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-sand">{item.label}</dt>
                  <dd className="mt-1.5 text-sm font-light text-white/80">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </div>
  )
}
