import { NavLink } from "react-router-dom"

export type Pestana = { to: string; label: string; end?: boolean }

/**
 * Las pestañas de una sección (Finanzas, Turnos, Recordatorios, Ajustes…).
 *
 * Regla del panel: cada pestaña hace UNA sola cosa y es su propia página. Así
 * la dueña no ve todo mezclado y el código de cada pantalla queda aparte.
 * Van como `action` del PageHeader de cada página de la sección.
 */
export default function Pestanas({ pestanas, etiqueta }: { pestanas: Pestana[]; etiqueta: string }) {
  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-cream-dark p-1" aria-label={etiqueta}>
      {pestanas.map((p) => (
        <NavLink
          key={p.to}
          to={p.to}
          end={p.end}
          className={({ isActive }) =>
            `shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-base transition ${
              isActive ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`
          }
        >
          {p.label}
        </NavLink>
      ))}
    </nav>
  )
}
