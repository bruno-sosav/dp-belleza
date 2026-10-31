/** Mientras llegan los productos de la API, o si falló. */
export function Loading({ text = "Cargando productos…" }: { text?: string }) {
  return <p className="py-20 text-center text-sm text-ink-soft">{text}</p>
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-cream-dark bg-cream-dark/30 px-5 py-12 text-center">
      <p className="font-display text-lg text-ink">No pudimos cargar la tienda</p>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 text-sm font-medium text-rose-dark underline transition hover:text-ink"
      >
        Reintentar
      </button>
    </div>
  )
}
