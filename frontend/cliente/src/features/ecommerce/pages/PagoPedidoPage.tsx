import { useCallback, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import { useNegocio } from "../../../shared/lib/negocio"
import { whatsappUrl } from "../../home/lib/whatsapp"
import { consultarPago, linkDePago, type PedidoPagable } from "../api/checkout.api"
import { LoadError, Loading } from "../components/LoadState"
import ResumenDePedido from "../components/ResumenDePedido"

const primario = "rounded-md bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark disabled:cursor-wait disabled:opacity-60"
const secundario = "rounded-md border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"

/** Ícono, título y explicación de cada final. `enProceso`: lo que dice Mercado Pago en la URL, solo para el texto. */
function textos(p: PedidoPagable, enProceso: boolean) {
  if (p.pagoEstado === "pagado") {
    return { icono: "✓", titulo: "¡Pago aprobado!", detalle: `Tu pedido #${p.id} está confirmado. Te vamos a escribir por WhatsApp para coordinar la entrega.` }
  }
  if (p.estado === "cancelado") return { icono: "✕", titulo: "Este pedido está cancelado", detalle: "Escribinos por WhatsApp si tenés dudas." }
  if (enProceso) {
    return { icono: "⏳", titulo: "Tu pago se está procesando", detalle: "Puede tardar unos minutos en acreditarse. Cuando se acredite, el pedido se confirma solo." }
  }
  return { icono: "⏳", titulo: "Todavía no recibimos el pago", detalle: `Tu pedido #${p.id} está guardado. Si el pago no se completó, podés intentar de nuevo.` }
}

/** Pagar (o reintentar), volver a revisar, seguir comprando y WhatsApp, según cómo quedó el pedido. */
function Botones(props: {
  puedePagar: boolean
  destacarWhatsApp: boolean
  yendo: boolean
  total: number
  whatsapp: string | null
  onPagar: () => void
  onRevisar: () => void
}) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {props.puedePagar ? (
        <>
          <button type="button" onClick={props.onRevisar} className={secundario}>
            Ya pagué, volver a revisar
          </button>
          <button type="button" disabled={props.yendo} onClick={props.onPagar} className={primario}>
            {props.yendo ? "Abriendo Mercado Pago…" : `Pagar ${formatPrice(props.total)}`}
          </button>
        </>
      ) : (
        <Link to="/tienda" className={secundario}>
          Seguir comprando
        </Link>
      )}
      {props.whatsapp && (
        <a href={props.whatsapp} target="_blank" rel="noreferrer" className={props.destacarWhatsApp ? primario : secundario}>
          Escribinos por WhatsApp
        </a>
      )}
    </div>
  )
}

/**
 * Vuelta de Mercado Pago (/pedido/pago?t=<token>): con `payment_id` el backend consulta el pago y confirma el pedido.
 * Tres finales: pagado, todavía sin pagar (o rechazado: puede reintentar) o cancelado.
 */
export default function PagoPedidoPage() {
  const [params] = useSearchParams()
  const token = params.get("t") ?? ""
  const pagoId = params.get("payment_id") ?? params.get("collection_id")
  // Lo que dice Mercado Pago en la URL: solo para elegir el texto, el que manda es el backend.
  const enProceso = ["pending", "in_process"].includes(params.get("status") ?? params.get("collection_status") ?? "")
  const pedir = useCallback(() => consultarPago(token, pagoId), [token, pagoId])
  const estado = useApi(pedir)
  const negocio = useNegocio()
  const [yendo, setYendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pagar() {
    setYendo(true)
    setError(null)
    try {
      window.location.assign((await linkDePago(token)).link)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir Mercado Pago. Probá de nuevo.")
      setYendo(false)
    }
  }

  if (estado.loading) return <Loading text="Revisando el pago…" />
  if (estado.error || !estado.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadError message={estado.error ?? "No encontramos ese pedido."} onRetry={estado.reload} />
      </div>
    )
  }

  const p = estado.data
  const pagado = p.pagoEstado === "pagado"
  const cancelado = p.estado === "cancelado"
  const mensaje = `¡Hola! Te escribo por el pedido #${p.id} de la tienda online.`
  const texto = textos(p, enProceso)
  const puedePagar = !pagado && !cancelado && p.pagoEstado === "pendiente"

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-cream-dark bg-surface p-8 text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${pagado ? "bg-rose/25" : "bg-cream-dark"}`}>
          {texto.icono}
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{texto.titulo}</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">{texto.detalle}</p>

        <ResumenDePedido items={p.items} total={p.total} />

        {error && (
          <p role="alert" className="mt-6 rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-ink">
            {error}
          </p>
        )}

        <Botones
          puedePagar={puedePagar}
          destacarWhatsApp={pagado}
          yendo={yendo}
          total={p.total}
          whatsapp={negocio?.telefono ? whatsappUrl(negocio.telefono, mensaje) : null}
          onPagar={() => void pagar()}
          onRevisar={estado.reload}
        />
      </div>
    </div>
  )
}
