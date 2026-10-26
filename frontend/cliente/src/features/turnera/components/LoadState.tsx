import { Link } from "react-router-dom"
import { containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

/** Pantalla mientras llega un dato de la API. */
export function PageLoading() {
  return (
    <div className={`${containerClass} py-24 text-center`}>
      <p className="text-sm text-ink-soft">Cargando…</p>
    </div>
  )
}

/** Pantalla cuando la API falló (no cuando algo no existe: eso es un 404 con su propio texto). */
export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={`${containerClass} py-24 text-center`}>
      <h1 className="font-display text-2xl text-ink">No pudimos cargar esta página</h1>
      <p className="mt-2 text-ink-soft">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry} className={primaryButtonClass}>
          Reintentar
        </button>
        <Link to="/contacto" className={secondaryButtonClass}>
          Reservar por WhatsApp
        </Link>
      </div>
    </div>
  )
}

/** Error dentro de una sección (no ocupa la página entera). */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-cream-dark bg-cream-dark/30 px-5 py-8 text-center">
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-rose-dark underline transition hover:text-ink"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
