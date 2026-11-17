import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { despacharEnvio, useSeguimiento, type PedidoDetalle } from "../api/pedidos.api"
import { mensajeDe } from "../lib/errores"

const estados = { a_despachar: "A despachar", despachado: "Despachado", entregado: "Entregado" } as const

/** Cómo recibe el pedido: retiro, o el envío con su dirección, costo, número de seguimiento y el botón para despacharlo. */
export default function PanelEnvio({ pedido, onCambio }: { pedido: PedidoDetalle; onCambio: (p: PedidoDetalle) => void }) {
  const e = pedido.envio
  if (!e) {
    return (
      <Panel title="Entrega">
        <p className="text-sm text-ink">Retira en el local.</p>
      </Panel>
    )
  }
  return (
    <Panel title={`Envío ${e.proveedor === "prueba" ? "(modo prueba)" : "por Andreani"}`}>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-ink">{e.calle}</p>
          <p className="text-ink-soft">
            {e.ciudad}, {e.provincia} · CP {e.codigoPostal}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-ink">
            {estados[e.estado]}
            {e.numeroSeguimiento && <span className="text-ink-soft"> · N° {e.numeroSeguimiento}</span>}
          </p>
          <p className="text-ink-soft">
            Costo: {e.costo ? formatPrice(e.costo) : "gratis"}
            {e.plazoDias ? ` · ${e.plazoDias} días hábiles` : ""}
          </p>
        </div>
      </div>
      {e.estado === "a_despachar" ? <Despachar pedido={pedido} onCambio={onCambio} /> : <Seguimiento id={pedido.id} />}
    </Panel>
  )
}

function Despachar({ pedido, onCambio }: { pedido: PedidoDetalle; onCambio: (p: PedidoDetalle) => void }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const despachar = async () => {
    setEnviando(true)
    setError(null)
    try {
      onCambio(await despacharEnvio(pedido.id))
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }
  if (pedido.estado !== "confirmado") {
    return <p className="mt-4 text-sm text-ink-soft">Cuando confirmes el pedido vas a poder generar el envío.</p>
  }
  return (
    <div className="mt-4">
      <button type="button" disabled={enviando} onClick={() => void despachar()} className={primaryButtonClass}>
        {enviando ? "Generando el envío…" : "Generar envío"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}

function Seguimiento({ id }: { id: number }) {
  const [abierto, setAbierto] = useState(false)
  const s = useSeguimiento(id, abierto)
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={`${secondaryButtonClass} mt-4`}>
        Ver seguimiento
      </button>
    )
  }
  if (s.error) return <ErrorCarga mensaje={s.error} onReintentar={s.recargar} alto="h-24" />
  if (!s.datos) return <Cargando alto="h-24" />
  return (
    <ol className="mt-4 space-y-2 border-l-2 border-leaf/40 pl-4 text-sm">
      {s.datos.length === 0 && <li className="text-ink-soft">Todavía no hay movimientos.</li>}
      {s.datos.map((ev) => (
        <li key={`${ev.fecha}-${ev.estado}`}>
          <span className="font-medium text-ink">{ev.estado}</span> <span className="text-ink-soft">· {ev.fecha}</span>
          {ev.detalle && <p className="text-ink-soft">{ev.detalle}</p>}
        </li>
      ))}
    </ol>
  )
}
