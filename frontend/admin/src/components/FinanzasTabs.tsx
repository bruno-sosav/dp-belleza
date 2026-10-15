import { NavLink } from "react-router-dom"

const tabs = [
  { to: "/finanzas", end: true, label: "💰 Ganancias" },
  { to: "/finanzas/turnos", label: "📊 Turnos" },
]

/** Las dos pestañas de Finanzas. Van como `action` del PageHeader de cada una. */
export default function FinanzasTabs() {
  return (
    <nav className="flex gap-1 rounded-xl bg-cream-dark p-1" aria-label="Secciones de Finanzas">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2.5 text-base transition ${isActive ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
