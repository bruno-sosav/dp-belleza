import { Component, type ErrorInfo, type ReactNode } from "react"
import { cardClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

type Estado = { error: Error | null }

/** Si una sección tira un error al dibujarse, muestra un aviso y el resto del panel sigue andando. */
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
      <div className={`${cardClass} px-6 py-16 text-center`} role="alert">
        <p className="font-display text-2xl font-semibold text-ink">Algo salió mal en esta pantalla</p>
        <p className="mt-2 text-sm text-ink-soft">El resto del panel sigue andando. Probá recargar; si vuelve a pasar, avisanos.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className={primaryButtonClass}>
            Recargar
          </button>
          <a href="/" className={secondaryButtonClass}>
            Ir a Hoy
          </a>
        </div>
      </div>
    )
  }
}
