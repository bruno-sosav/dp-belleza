import type { ReactNode } from "react"
import { periodOptions } from "../lib/stats"
import { usePeriod } from "../lib/usePeriod"

/**
 * Título de la sección + filtro de período. El filtro afecta a todo lo que está
 * debajo, para que todos los números de la pantalla coincidan.
 */
export default function PageHeader({ title, description, withPeriod = true, action }: { title: string; description?: string; withPeriod?: boolean; action?: ReactNode }) {
  const { period, setPeriod } = usePeriod()

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
        {action}
      </div>

      {withPeriod && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-cream-dark p-1" role="radiogroup" aria-label="Período">
            {periodOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={period === o.value}
                onClick={() => setPeriod(o.value)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  period === o.value ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-cream-dark px-2.5 py-1 text-xs text-ink-soft" title="Se reemplazan por los datos reales cuando esté conectado el backend">
            Datos de demostración
          </span>
        </div>
      )}
    </div>
  )
}
