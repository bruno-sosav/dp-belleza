import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useCart } from "../../features/ecommerce/context/CartContext"
import { useCategorias } from "../../features/ecommerce/api/catalogo.api"
import AnnouncementBar from "./AnnouncementBar"
import Brand from "./Brand"

// En el mismo orden que las secciones de la portada, para que al bajar el link
// marcado avance de izquierda a derecha. "Mi turno" no tiene sección: va al final.
const links = [
  { to: "/", label: "Inicio" },
  { to: "/#nosotros", label: "Nosotros" },
  { to: "/servicios", label: "Servicios" },
  { to: "/tienda", label: "Tienda" },
  { to: "/contacto", label: "Contacto" },
  { to: "/mi-turno", label: "Mi turno" },
]

export default function Navbar() {
  const { count, openCart } = useCart()
  const categorias = useCategorias()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // En la portada, el link de la sección que se está viendo (ver data-nav en HomePage).
  const [currentSection, setCurrentSection] = useState("/")
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const onHome = pathname === "/"
    let frame = 0
    const update = () => {
      frame = 0
      setScrolled(window.scrollY > 40)
      // La sección activa es la última que ya pasó por arriba del primer tercio de la pantalla.
      const line = window.innerHeight / 3
      let current = "/"
      // Se buscan cada vez porque algunas (como Tratamientos) aparecen cuando responde la API.
      const sections = onHome ? document.querySelectorAll<HTMLElement>("[data-nav]") : []
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.dataset.nav ?? current
      }
      setCurrentSection(current)
    }
    // El navegador puede disparar varios scroll por cuadro: se mide una sola vez por cuadro.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [pathname])

  // En la portada el menú flota transparente sobre la foto del hero; al bajar
  // (o al abrir el menú / la búsqueda) pasa a crema para que se lea.
  const isHome = pathname === "/"
  const overHero = isHome && !scrolled && !menuOpen && !searchOpen

  // En la portada se marca la sección que se está viendo; en el resto, la página.
  const isLinkActive = (to: string) => {
    if (isHome) return to === currentSection
    const [path, anchor] = to.split("#")
    if (anchor) return pathname === path && hash === `#${anchor}`
    if (path === "/") return false
    return pathname.startsWith(path)
  }

  const iconClass = `transition ${overHero ? "text-white/85 hover:text-white" : "text-ink/75 hover:text-leaf"}`

  return (
    <header
      className={`${isHome ? "fixed inset-x-0" : "sticky"} top-0 z-40 transition-colors duration-300 ${
        overHero ? "bg-transparent" : "bg-cream/95 shadow-[0_1px_16px_rgba(34,38,31,0.06)]"
      }`}
    >
      <AnnouncementBar />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <button
          type="button"
          className={`flex items-center gap-2 lg:hidden ${iconClass}`}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Brand light={overHero} />

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => {
            const active = isLinkActive(link.to)
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`relative text-[0.68rem] font-semibold uppercase tracking-[0.2em] transition after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-current after:transition-all after:duration-300 hover:after:w-full ${
                  active ? "after:w-full" : "after:w-0"
                } ${overHero ? "text-white/85 hover:text-white" : active ? "text-leaf" : "text-ink/70 hover:text-ink"}`}
              >
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          <button type="button" aria-label="Buscar" onClick={() => setSearchOpen((v) => !v)} className={iconClass}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </button>

          <button type="button" aria-label="Ver carrito" onClick={openCart} className={`relative ${iconClass}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M6 7h12l-1 12.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19.5L6 7z" />
              <path d="M9 7a3 3 0 016 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose text-[10px] font-semibold text-forest">
                {count}
              </span>
            )}
          </button>

          <Link
            to="/servicios"
            className={`hidden items-center rounded-sm px-5 py-2.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] transition sm:inline-flex ${
              overHero
                ? "border border-white/40 text-white hover:border-white hover:bg-white/10"
                : "bg-forest text-cream hover:bg-forest-soft"
            }`}
          >
            Reservar
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-ink/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-sm border border-cream-dark bg-surface px-3 py-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
            />
          </div>
        </div>
      )}

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-ink/10 px-4 py-4 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`rounded-sm px-2 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-cream-dark ${
                isLinkActive(link.to) ? "text-leaf" : "text-ink/80"
              }`}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="mt-2 border-t border-ink/10 pt-3">
            <p className="px-2 pb-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-ink-soft/70">
              Categorías de la tienda
            </p>
            {(categorias.data ?? []).map(({ id, nombre: c }) => (
              <NavLink
                key={id}
                to={`/tienda?categoria=${encodeURIComponent(c)}`}
                onClick={() => setMenuOpen(false)}
                className="block rounded-sm px-2 py-1.5 text-sm text-ink-soft hover:bg-cream-dark hover:text-ink"
              >
                {c}
              </NavLink>
            ))}
          </div>
          <Link
            to="/servicios"
            onClick={() => setMenuOpen(false)}
            className="mt-3 inline-flex justify-center rounded-sm bg-forest px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-cream"
          >
            Reservar turno
          </Link>
        </nav>
      )}
    </header>
  )
}
