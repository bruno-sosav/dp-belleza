import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../../../shared/components/PageHeader"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { cardClass, inputClass } from "../../../shared/lib/styles"
import { formatShortDate } from "../../../shared/lib/format"
import { nombreCliente, usePedidos, type EstadoPedido as Estado, type PedidoResumen } from "../api/pedidos.api"
import EstadoPedido from "../components/EstadoPedido"

type Filtro = "para-preparar" | Estado | "todos"

const pestanas: { value: Filtro; label: string }[] = [
  { value: "para-preparar", label: "Para preparar" },
  { value: "entregado", label: "Entregados" },
  { value: "cancelado", label: "Cancelados" },
  { value: "todos", label: "Todos" },
]

/** "Para preparar" junta pendientes y confirmados: los que todavía hay que entregar. */
const pasaFiltro = (p: PedidoResumen, f: Filtro) =>
  f === "todos" ? true : f === "para-preparar" ? p.estado === "pendiente" || p.estado === "confirmado" : p.estado === f

const coincide = (p: PedidoResumen, termino: string) =>
  !termino || `#${p.id}`.includes(termino) || nombreCliente(p.cliente).toLowerCase().includes(termino) || p.cliente.telefono.includes(termino)

/** Pedidos de la tienda: los que hay que preparar arriba, con la clienta, el total y cómo va el pago. */
export default function OrdersPage() {
  const { datos, cargando, error, recargar } = usePedidos()
  const [filtro, setFiltro] = useState<Filtro>("para-preparar")
  const [busqueda, setBusqueda] = useState("")

  const pedidos = useMemo(() => datos ?? [], [datos])
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return pedidos.filter((p) => pasaFiltro(p, filtro) && coincide(p, termino))
  }, [pedidos, filtro, busqueda])

  return (
    <div>
      <PageHeader withPeriod={false} title="Pedidos" description="Los pedidos de la tienda online. Tocá uno para ver el detalle, confirmarlo o marcarlo entregado." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-cream-dark p-1" role="tablist">
          {pestanas.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={filtro === t.value}
              onClick={() => setFiltro(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                filtro === t.value ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label} <span className="text-ink-soft/70">({pedidos.filter((p) => pasaFiltro(p, t.value)).length})</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por #, nombre o teléfono…"
          aria-label="Buscar pedidos"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      {!datos && cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : (
        <ul className={`${cardClass} mt-4 divide-y divide-cream-dark`}>
          {visibles.length === 0 && <li className="px-5 py-12 text-center text-sm text-ink-soft">No hay pedidos para mostrar.</li>}
          {visibles.map((p) => (
            <li key={p.id}>
              <Link to={`/pedidos/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 transition hover:bg-cream-dark/40 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    #{p.id} · {nombreCliente(p.cliente)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatShortDate(p.creadoEn.slice(0, 10))} {p.creadoEn.slice(11, 16)} · {p.unidades} {p.unidades === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <EstadoPedido estado={p.estado} pagoEstado={p.pagoEstado} />
                <span className="w-24 shrink-0 text-right font-medium tabular-nums text-ink">{formatPrice(p.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
