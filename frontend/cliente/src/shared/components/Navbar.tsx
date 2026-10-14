import { useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { categories } from "../data/products"
import { useCart } from "../context/CartContext"

const links = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/servicios", label: "Turnos" },
  { to: "/#nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
]

export default function Navbar() {
  const { count, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname, hash } = useLocation()

  // "Nosotros" es una sección de la landing: se marca activo según el #ancla, no solo la ruta.
  const isLinkActive = (to: string) => {
    const [path, anchor] = to.split("#")
    if (anchor) return pathname === path && hash === `#${anchor}`
    if (path === "/") return pathname === "/" && !hash
    return pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rose-dark/30 bg-rose">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="flex items-center gap-2 text-ink lg:hidden"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-ink">
          Dp.belleza
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={`text-sm tracking-wide transition hover:text-white ${
                isLinkActive(link.to) ? "font-semibold text-white" : "text-ink/75"
              }`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="text-ink/80 transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </button>

          <button type="button" aria-label="Mi cuenta" className="hidden text-ink/80 transition hover:text-white sm:block">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Ver carrito"
            onClick={openCart}
            className="relative text-ink/80 transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M6 7h12l-1 12.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19.5L6 7z" />
              <path d="M9 7a3 3 0 016 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-cream">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-rose-dark/30 bg-rose-dark px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-2 rounded-md border border-cream-dark bg-surface px-3 py-2">
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
        <nav className="flex flex-col gap-1 border-t border-rose-dark/30 bg-rose-dark px-4 py-3 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded px-2 py-2 text-sm text-cream/85 hover:bg-cream/10 hover:text-cream"
            >
              {link.label}
            </NavLink>
          ))}
          <div className="mt-2 border-t border-cream/15 pt-2">
            <p className="px-2 pb-1 text-xs uppercase tracking-wide text-cream/60">Categorías</p>
            {categories.map((c) => (
              <NavLink
                key={c}
                to={`/tienda?categoria=${encodeURIComponent(c)}`}
                onClick={() => setMenuOpen(false)}
                className="block rounded px-2 py-1.5 text-sm text-cream/85 hover:bg-cream/10 hover:text-cream"
              >
                {c}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
