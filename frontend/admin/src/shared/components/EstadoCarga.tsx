/** Cargando / error con reintentar. Nunca un cero en lugar de un error: no es lo mismo. */
import { secondaryButtonClass } from "../lib/styles"

export function Cargando({ alto = "h-48" }: { alto?: string }) {
  return (
    <div className={`flex ${alto} items-center justify-center`} role="status" aria-live="polite">
      <span className="text-sm text-ink-soft">Cargando…</span>
    </div>
  )
}

export function ErrorCarga({
  mensaje,
  onReintentar,
  alto = "h-48",
}: {
  mensaje: string
  onReintentar?: () => void
  alto?: string
}) {
  return (
    <div className={`flex ${alto} flex-col items-center justify-center gap-3 px-4 text-center`} role="alert">
      <p className="text-sm text-ink-soft">{mensaje}</p>
      {onReintentar && (
        <button type="button" onClick={onReintentar} className={secondaryButtonClass}>
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Para las partes que todavía no tienen backend conectado. */
export function Pendiente({ children, alto = "h-48" }: { children: React.ReactNode; alto?: string }) {
  return (
    <div className={`flex ${alto} items-center justify-center px-6 text-center`}>
      <p className="text-sm text-ink-soft">{children}</p>
    </div>
  )
}
