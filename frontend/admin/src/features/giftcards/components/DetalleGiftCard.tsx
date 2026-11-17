import { useCallback, useState } from "react"
import { Link } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { formatShortDate, formatTelefono } from "../../../shared/lib/format"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { useApi } from "../../../shared/lib/useApi"
import { anularGiftCard, verGiftCard, type Movimiento } from "../api/giftCards.api"

const textoMovimiento: Record<Movimiento["tipo"], string> = { carga: "Carga", uso: "Uso", reintegro: "Devolución", anulacion: "Anulada" }

/** Una gift card abierta: quién la compró, el mensaje y cada carga, uso o devolución con el saldo que quedó. */
export default function DetalleGiftCard({ id, onCambio }: { id: number; onCambio: () => void }) {
  const pedir = useCallback(() => verGiftCard(id), [id])
  const { datos: g, cargando, error, recargar } = useApi(pedir)
  const [confirmando, setConfirmando] = useState(false)
  const [errorAnular, setErrorAnular] = useState<string | null>(null)

  if (!g && cargando) return <Cargando />
  if (!g) return <ErrorCarga mensaje={error ?? "No se pudo cargar la gift card."} onReintentar={recargar} />

  async function anular() {
    setErrorAnular(null)
    try {
      await anularGiftCard(id)
      setConfirmando(false)
      recargar()
      onCambio()
    } catch (err) {
      setErrorAnular(err instanceof ApiError ? err.message : "No se pudo anular.")
    }
  }

  const sinUsar = g.estado === "activa" && g.saldo === g.monto
  return (
    <div className="space-y-4 rounded-xl bg-cream px-4 py-4 sm:px-5">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <p>
          <span className="text-ink-soft">Compró: </span>
          <span className="text-ink">{g.comprador.nombre}</span>
          {g.comprador.telefono && <span className="text-ink-soft"> · {formatTelefono(g.comprador.telefono)}</span>}
        </p>
        <p>
          <span className="text-ink-soft">Vendida: </span>
          <span className="text-ink">
            {g.origen === "web" ? "en la web" : "en el local"} · {formatShortDate(g.creadaEn.slice(0, 10))}
          </span>
        </p>
        {g.mensaje && <p className="italic text-ink sm:col-span-2">“{g.mensaje}”</p>}
      </div>

      {g.movimientos.length > 0 && (
        <ul className="divide-y divide-cream-dark text-sm">
          {g.movimientos.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="w-24 shrink-0 tabular-nums text-ink-soft">
                {formatShortDate(m.fechaHora.slice(0, 10))} {m.fechaHora.slice(11, 16)}
              </span>
              <span className="min-w-0 flex-1 text-ink">
                {textoMovimiento[m.tipo]}
                {m.pedidoId ? (
                  <>
                    {" · "}
                    <Link to={`/pedidos/${m.pedidoId}`} className="underline underline-offset-2 hover:text-rose-dark">
                      pedido #{m.pedidoId}
                    </Link>
                  </>
                ) : m.descripcion ? (
                  <span className="text-ink-soft"> · {m.descripcion}</span>
                ) : null}
              </span>
              <span className="tabular-nums text-ink">
                {m.tipo === "uso" || m.tipo === "anulacion" ? "−" : "+"} {formatPrice(m.monto)}
              </span>
              <span className="w-28 text-right tabular-nums text-ink-soft">queda {formatPrice(m.saldoDespues)}</span>
            </li>
          ))}
        </ul>
      )}

      {errorAnular && (
        <p className="rounded-lg bg-peligro-claro px-3 py-2 text-sm text-peligro" role="alert">
          {errorAnular}
        </p>
      )}
      {sinUsar &&
        (confirmando ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink">¿Anularla? Ya no se va a poder usar. La plata, si hay que devolverla, se devuelve a mano.</span>
            <button type="button" onClick={() => void anular()} className="rounded-lg bg-peligro px-4 py-2 font-semibold text-white">
              Sí, anular
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="px-2 text-ink-soft underline">
              No
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className={secondaryButtonClass}>
            Anular gift card
          </button>
        ))}
    </div>
  )
}
