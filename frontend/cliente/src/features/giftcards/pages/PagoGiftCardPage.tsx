import { useCallback, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ApiError } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import { useNegocio } from "../../../shared/lib/negocio"
import { whatsappUrl } from "../../home/lib/whatsapp"
import { LoadError, Loading } from "../../ecommerce/components/LoadState"
import { consultarGiftCard, linkDePagoGiftCard, type GiftCardComprada } from "../api/giftCards.api"
import TarjetaDeRegalo from "../components/TarjetaDeRegalo"

const primario = "rounded-sm bg-forest px-6 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft disabled:cursor-wait disabled:opacity-60"
const secundario = "rounded-sm border border-forest/40 px-6 py-3 text-sm font-medium text-ink transition hover:bg-forest hover:text-cream"

/** Pagada: copiar el código y mandarlo. Sin pagar: reintentar o revisar. Anulada: volver. */
function Botones(props: {
  estado: GiftCardComprada["estado"]
  codigo: string | null
  regalo: string
  yendo: boolean
  whatsapp: string | null
  onPagar: () => void
  onRevisar: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const { codigo } = props
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {codigo ? (
        <>
          <button type="button" className={secundario} onClick={() => void navigator.clipboard?.writeText(codigo).then(() => setCopiado(true))}>
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(props.regalo)}`} target="_blank" rel="noreferrer" className={primario}>
            Mandarla por WhatsApp
          </a>
        </>
      ) : props.estado === "pendiente_pago" ? (
        <>
          <button type="button" onClick={props.onRevisar} className={secundario}>
            Ya pagué, volver a revisar
          </button>
          <button type="button" disabled={props.yendo} onClick={props.onPagar} className={primario}>
            {props.yendo ? "Abriendo Mercado Pago…" : "Pagar"}
          </button>
        </>
      ) : (
        <Link to="/gift-cards" className={secundario}>
          Volver a gift cards
        </Link>
      )}
      {props.whatsapp && (
        <a href={props.whatsapp} target="_blank" rel="noreferrer" className={secundario}>
          Escribinos por WhatsApp
        </a>
      )}
    </div>
  )
}

/** Vuelta de Mercado Pago (/gift-cards/pago?t=<token>): si se pagó, el código para regalar; si no, reintentar. */
export default function PagoGiftCardPage() {
  const [params] = useSearchParams()
  const token = params.get("t") ?? ""
  const pagoId = params.get("payment_id") ?? params.get("collection_id")
  const pedir = useCallback(() => consultarGiftCard(token, pagoId), [token, pagoId])
  const estado = useApi(pedir)
  const negocio = useNegocio()
  const [yendo, setYendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pagar() {
    setYendo(true)
    setError(null)
    try {
      window.location.assign((await linkDePagoGiftCard(token)).link)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir Mercado Pago. Probá de nuevo.")
      setYendo(false)
    }
  }

  if (estado.loading) return <Loading text="Revisando el pago…" />
  if (estado.error || !estado.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadError message={estado.error ?? "No encontramos esa compra."} onRetry={estado.reload} />
      </div>
    )
  }

  const g = estado.data
  const pagada = g.estado === "activa" && g.codigo
  const regalo = pagada ? `¡Te regalo una gift card de DP Belleza! Tu código es ${g.codigo}. Se usa en la tienda online o en el local.` : ""

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-cream-dark bg-surface p-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">{pagada ? "¡Tu gift card está lista!" : "Todavía no recibimos el pago"}</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          {pagada
            ? "Guardá el código: es lo que se usa para pagar. Podés mandárselo por WhatsApp a quien se la regales."
            : "Si el pago no se completó, podés intentar de nuevo. Si ya pagaste, puede tardar unos minutos en acreditarse."}
        </p>

        <div className="mt-8 flex justify-center">
          <TarjetaDeRegalo monto={g.monto} para={g.para} mensaje={g.mensaje} codigo={g.codigo} />
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-ink">
            {error}
          </p>
        )}

        <Botones
          estado={g.estado}
          codigo={pagada ? g.codigo : null}
          regalo={regalo}
          yendo={yendo}
          whatsapp={!pagada && negocio?.telefono ? whatsappUrl(negocio.telefono, "¡Hola! Te escribo por una gift card que compré en la web.") : null}
          onPagar={() => void pagar()}
          onRevisar={estado.reload}
        />
      </div>
    </div>
  )
}
