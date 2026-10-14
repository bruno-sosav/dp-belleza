import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"
import AdminLogin from "../pages/AdminLogin"
import { hasSession, logout } from "../lib/auth"
import type { Period } from "../lib/stats"
import type { AdminOutletContext } from "../lib/usePeriod"

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

const navItems = [
  { to: "/admin", end: true, label: "Resumen", icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />) },
  { to: "/admin/turnos", label: "Turnos", icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { to: "/admin/ventas", label: "Ventas tienda", short: "Ventas", icon: icon(<><path d="M6 7h12l-1 12.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19.5L6 7z" /><path d="M9 7a3 3 0 016 0" /></>) },
  { to: "/admin/productos", label: "Productos", icon: icon(<><path d="M4 7l8-4 8 4-8 4-8-4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>) },
]

/**
 * Marco de todas las pantallas /admin: menú lateral (arriba en el celular),
 * login si no hay sesión y el período elegido, compartido entre secciones.
 * No usa el Layout de la tienda: sin navbar, carrito ni footer públicos.
 */
export default function AdminLayout() {
  const [loggedIn, setLoggedIn] = useState(hasSession)
  const [period, setPeriod] = useState<Period>(30)

  // Que los buscadores no indexen el panel.
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  if (!loggedIn) return <AdminLogin onSuccess={() => setLoggedIn(true)} />

  const context: AdminOutletContext = { period, setPeriod }

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="border-b border-cream-dark bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:py-6">
          <Link to="/admin" className="font-display text-xl font-semibold text-ink">
            Dp.belleza <span className="ml-1 font-sans text-[11px] font-medium uppercase tracking-wide text-rose-dark">Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              setLoggedIn(false)
            }}
            className="text-sm text-ink-soft hover:text-ink lg:hidden"
          >
            Salir
          </button>
        </div>

        <nav className="grid grid-cols-4 gap-1 px-3 pb-3 lg:flex lg:flex-1 lg:flex-col lg:px-3 lg:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs transition lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${
                  isActive ? "bg-cream-dark font-medium text-ink" : "text-ink-soft hover:bg-cream-dark/50 hover:text-ink"
                }`
              }
            >
              {item.icon}
              <span className="lg:hidden">{item.short ?? item.label}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden space-y-1 border-t border-cream-dark px-3 py-4 lg:block">
          <Link to="/" target="_blank" className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-cream-dark/50 hover:text-ink">
            Ver sitio ↗
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              setLoggedIn(false)
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-cream-dark/50 hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet context={context} />
        </div>
      </main>
    </div>
  )
}
