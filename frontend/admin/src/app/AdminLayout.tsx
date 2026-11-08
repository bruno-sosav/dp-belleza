import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import LoginPage from "../features/auth/pages/LoginPage"
import ErrorBoundary from "../shared/components/ErrorBoundary"
import { cerrarSesion, EVENTO_SESION, haySesion, usuarioActual } from "../shared/lib/sesion"
import type { Usuario } from "../shared/lib/sesion"
import type { Period } from "../shared/lib/stats"
import type { AdminOutletContext } from "../shared/lib/usePeriod"

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

/** La web pública es otra app en otro dominio: por eso un <a> y no un <Link>. */
const siteUrl = import.meta.env.VITE_SITE_URL ?? "http://localhost:5173"

const navItems = [
  { to: "/", end: true, label: "Hoy", icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { to: "/turnos", label: "Turnos", icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { to: "/recordatorios", label: "Recordatorios", short: "Avisos", icon: icon(<><path d="M4 5h16v11H8l-4 4V5z" /><path d="M8 9h8M8 12h5" /></>) },
  { to: "/clientes", label: "Clientas", icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14.5a6.5 6.5 0 013.5 5.5" /></>) },
  { to: "/servicios", label: "Servicios", icon: icon(<><path d="M12 3c-3 3.5-3 7 0 10 3-3 3-6.5 0-10z" /><path d="M12 13c-4-2-7.5-1.5-9 1 2.5 3.5 6 4 9 2M12 13c4-2 7.5-1.5 9 1-2.5 3.5-6 4-9 2M12 16v5" /></>) },
  { to: "/finanzas", label: "Finanzas", icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />) },
  { to: "/pedidos", label: "Pedidos", icon: icon(<><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></>) },
  { to: "/ventas", label: "Ventas tienda", short: "Ventas", icon: icon(<><path d="M6 7h12l-1 12.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19.5L6 7z" /><path d="M9 7a3 3 0 016 0" /></>) },
  { to: "/productos", label: "Productos", icon: icon(<><path d="M4 7l8-4 8 4-8 4-8-4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>) },
]

const iconoAjustes = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </>,
)

const itemMenu = "flex items-center rounded-lg transition"
/** La sección abierta: fondo oliva claro, texto verde y una rayita a la izquierda. */
const claseActivo = (activo: boolean) =>
  activo ? "bg-rose/35 font-semibold text-forest lg:shadow-[inset_3px_0_0_var(--color-leaf)]" : "text-ink-soft hover:bg-cream-dark/60 hover:text-ink"

/** Marco del panel: menú, login si no hay sesión y el período compartido entre secciones. */
export default function AdminLayout() {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioActual)
  const [period, setPeriod] = useState<Period>(30)
  const { pathname } = useLocation()

  // Si cambia el nombre en Ajustes → Tu cuenta, se actualiza "Sesión de …".
  useEffect(() => {
    const alCambiar = () => setUsuario(usuarioActual())
    window.addEventListener(EVENTO_SESION, alCambiar)
    return () => window.removeEventListener(EVENTO_SESION, alCambiar)
  }, [])

  // Que los buscadores no indexen el panel.
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // Sin token no renderiza ninguna ruta del panel.
  if (!haySesion() || !usuario) return <LoginPage onSuccess={setUsuario} />

  const context: AdminOutletContext = { period, setPeriod }
  const salir = () => {
    cerrarSesion()
    setUsuario(null)
  }

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="border-b border-cream-dark bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="dppuntobelleza, ir a Hoy">
            <img src="/logo/logo-circulo.png" alt="" className="h-9 w-9 shrink-0 rounded-full" />
            <span className="flex flex-col leading-none">
              <span className="font-brand text-lg text-ink">dppuntobelleza</span>
              <span className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-leaf">Panel</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 lg:hidden">
            <NavLink to="/ajustes" className={({ isActive }) => `inline-flex items-center gap-1.5 text-sm ${isActive ? "font-semibold text-forest" : "text-ink-soft hover:text-ink"}`}>
              {iconoAjustes}
              Ajustes
            </NavLink>
            <button type="button" onClick={salir} className="text-sm text-ink-soft hover:text-ink">
              Salir
            </button>
          </div>
        </div>

        <nav className="grid grid-cols-4 gap-1 px-3 pb-3 lg:flex lg:flex-1 lg:flex-col lg:px-3 lg:pb-0">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${itemMenu} flex-col gap-1 px-1 py-2 text-sm lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-[0.95rem] ${claseActivo(isActive)}`}>
              {item.icon}
              <span className="lg:hidden">{item.short ?? item.label}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden space-y-0.5 border-t border-cream-dark px-3 py-4 lg:block">
          <p className="px-3 pb-2 text-sm text-ink-soft">
            Sesión de <span className="font-semibold text-ink">{usuario.nombre}</span>
          </p>
          <NavLink to="/ajustes" className={({ isActive }) => `${itemMenu} gap-3 px-3 py-2 text-sm ${claseActivo(isActive)}`}>
            {iconoAjustes}
            Ajustes
          </NavLink>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={`${itemMenu} gap-3 px-3 py-2 text-sm ${claseActivo(false)}`}>
            {icon(<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />)}
            Ver la web
          </a>
          <button type="button" onClick={salir} className={`${itemMenu} w-full gap-3 px-3 py-2 text-left text-sm ${claseActivo(false)}`}>
            {icon(<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" />)}
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <ErrorBoundary key={pathname}>
            <Outlet context={context} />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
