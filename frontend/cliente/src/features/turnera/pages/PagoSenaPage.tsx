import { useCallback, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { parseDateKey } from "../api/disponibilidad.api"
import { consultarSena, nuevoLinkDePago } from "../api/sena.api"
import { ApiError } from "../lib/api"
import { useApi } from "../lib/useApi"
import { formatLongDate, formatTime } from "../lib/format"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import { PageError, PageLoading } from "../components/LoadState"

/**
 * /reserva/pago?t=<token>: a donde vuelve la clienta después de pagar la seña
 * en Mercado Pago (que agrega `payment_id` y `status` a la URL).
 *
 * Con el payment_id el backend le pregunta a Mercado Pago y, si está aprobado,
 * confirma el turno. Muestra uno de tres finales: confirmado, todavía no se
 * acreditó (con botón para pagar o volver a revisar), o venció.
 */
export default function PagoSenaPage() {
  const [params] = useSearchParams()
  const token = params.get("t") ?? ""
  const pagoId = params.get("payment_id") ?? params.get("collection_id")
  const pedir = useCallback(() => consultarSena(token, pagoId), [token, pagoId])
  const estado = useApi(pedir)
  const [yendo, setYendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pagar() {
    setYendo(true)
    setError(null)
    try {
      window.location.assign((await nuevoLinkDePago(token)).link)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir Mercado Pago. Probá de nuevo.")
      setYendo(false)
    }
  }

  if (estado.error) return <PageError message={estado.error} onRetry={estado.reload} />
  if (estado.loading || !estado.data) return <PageLoading />

  const t = estado.data
  const fecha = parseDateKey(t.fecha)
  const pagada = t.sena.estado === "pagada" && t.estado === "confirmado"
  // Cancelado por ella misma o por el local no es "se venció": se lo dice tal cual.
  const cancelado = t.estado === "cancelado" && t.canceladoPor !== null && t.canceladoPor !== "sistema"
  const vencida = !cancelado && (t.sena.estado === "vencida" || (t.estado === "cancelado" && t.sena.estado !== "pagada"))

  return (
    <div className={`${containerClass} py-12`}>
      <div className="mx-auto max-w-xl text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${pagada ? "bg-rose/25" : "bg-cream-dark"}`}>
          {pagada ? "✓" : cancelado ? "✕" : vencida ? "⌛" : "⏳"}
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
          {pagada
            ? "¡Turno confirmado!"
            : cancelado
              ? "Este turno está cancelado"
              : vencida
                ? "Se venció el tiempo para pagar"
                : "Todavía no recibimos el pago"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          {cancelado
            ? t.canceladoPor === "clienta"
              ? "Lo cancelaste desde Mi turno. Si querés, reservá otro día."
              : "El local canceló este turno. Escribinos si tenés dudas."
            : pagada
            ? `Recibimos tu seña de ${formatPrice(t.sena.monto)}. El resto (${formatPrice(t.precio - t.sena.monto)}) lo abonás en el local.`
            : vencida
              ? "El horario se liberó porque la seña no se pagó a tiempo. Si todavía lo querés, reservalo de nuevo."
              : "Si ya pagaste, puede tardar unos minutos en acreditarse. Si no, podés pagar la seña ahora."}
        </p>

        <div className={`${cardClass} mt-8 p-5 text-left`}>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-soft/70">Turno {t.codigo}</p>
          <p className="mt-2 font-display text-lg font-semibold text-ink">{t.servicio}</p>
          <p className="mt-1 text-ink">
            {formatLongDate(fecha)} · {formatTime(t.hora)}
          </p>
          {!pagada && !vencida && t.venceA && <p className="mt-2 text-sm text-ink-soft">Podés pagar hasta las {t.venceA.slice(11)}.</p>}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose/50 bg-rose/10 px-5 py-4 text-sm text-ink" role="alert">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {pagada ? (
            <>
              <Link to="/mi-turno" className={secondaryButtonClass}>
                Ver mi turno
              </Link>
              <Link to="/" className={primaryButtonClass}>
                Volver al inicio
              </Link>
            </>
          ) : vencida || cancelado ? (
            <Link to="/servicios" className={primaryButtonClass}>
              Reservar de nuevo
            </Link>
          ) : (
            <>
              <button type="button" onClick={estado.reload} className={secondaryButtonClass}>
                Ya pagué, volver a revisar
              </button>
              <button type="button" disabled={yendo} onClick={() => void pagar()} className={primaryButtonClass}>
                {yendo ? "Abriendo Mercado Pago…" : `Pagar la seña (${formatPrice(t.sena.monto)})`}
              </button>
            </>
          )}
        </div>
        {pagada && <p className="mt-6 text-sm text-ink-soft">Guardá tu código {t.codigo}: con él y tu teléfono podés ver o cancelar el turno en “Mi turno”.</p>}
      </div>
    </div>
  )
}
