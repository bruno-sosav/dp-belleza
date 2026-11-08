import { Component, type ErrorInfo, type ReactNode } from "react"

type Estado = { error: Error | null }

/** Si una página tira un error al dibujarse, muestra un aviso en vez de dejar todo en blanco. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center sm:px-6 lg:px-8" role="alert">
        <h1 className="font-display text-4xl font-medium text-ink">Algo salió mal</h1>
        <p className="mt-2 text-ink-soft">No pudimos mostrar esta página. Probá recargar o volvé al inicio.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-sm bg-forest px-7 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft"
          >
            Recargar
          </button>
          <a href="/" className="rounded-sm border border-ink/20 px-7 py-3 text-sm font-medium text-ink transition hover:border-ink">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }
}
