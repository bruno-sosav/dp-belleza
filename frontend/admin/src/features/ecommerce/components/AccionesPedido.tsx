import { useState } from "react"
import { primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { cambiarEstadoPedido, siguientes, type EstadoPedido, type PedidoDetalle } from "../api/pedidos.api"
import { mensajeDe } from "../lib/errores"

const textoDelBoton: Record<EstadoPedido, string> = {
  pendiente: "",
  confirmado: "Confirmar pedido",
  entregado: "Marcar entregado",
  cancelado: "Cancelar pedido",
}

/** Lo que conviene saber antes de cancelar: si ya se pagó, la plata hay que devolverla a mano. */
const avisoAlCancelar = (p: PedidoDetalle) =>
  p.pagoEstado === "pagado"
    ? "Este pedido ya se pagó por Mercado Pago: al cancelarlo el stock vuelve, pero la plata hay que devolverla desde Mercado Pago."
    : "El stock de estos productos vuelve a estar disponible en la tienda."

/** Los botones para mover el pedido. Cancelar pide confirmación. */
export default function AccionesPedido({ pedido, onCambio }: { pedido: PedidoDetalle; onCambio: (p: PedidoDetalle) => void }) {
  const [guardando, setGuardando] = useState(false)
  const [confirmandoBaja, setConfirmandoBaja] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const opciones = siguientes[pedido.estado]

  const mover = async (estado: EstadoPedido) => {
    setGuardando(true)
    setError(null)
    try {
      onCambio(await cambiarEstadoPedido(pedido.id, estado))
      setConfirmandoBaja(false)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  if (!opciones.length) return null

  return (
    <div>
      {pedido.estado === "pendiente" && pedido.pagoEstado === "pendiente" && (
        <p className="mb-3 text-sm text-ink-soft">
          La clienta todavía no pagó por Mercado Pago. Confirmalo solo si te pagó por otro medio.
        </p>
      )}
      {confirmandoBaja ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">{avisoAlCancelar(pedido)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirmandoBaja(false)} className={secondaryButtonClass}>
              Volver
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => void mover("cancelado")}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              Sí, cancelar el pedido
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {opciones.map((estado) =>
            estado === "cancelado" ? (
              <button key={estado} type="button" onClick={() => setConfirmandoBaja(true)} className={secondaryButtonClass}>
                {textoDelBoton[estado]}
              </button>
            ) : (
              <button key={estado} type="button" disabled={guardando} onClick={() => void mover(estado)} className={primaryButtonClass}>
                {textoDelBoton[estado]}
              </button>
            ),
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
