import { NavLink } from "react-router-dom"

export type Pestana = { to: string; label: string; end?: boolean }

/** Pestañas de una sección: cada una es su propia página. Van como `action` del PageHeader. */
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
              isActive ? "bg-surface font-semibold text-forest shadow-sm ring-1 ring-ink/5" : "text-ink-soft hover:bg-surface/60 hover:text-ink"
            }`
          }
        >
          {p.label}
        </NavLink>
      ))}
    </nav>
  )
}
