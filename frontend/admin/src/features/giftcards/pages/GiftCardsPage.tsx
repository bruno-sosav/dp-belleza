import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { cardClass, inputClass, primaryButtonClass } from "../../../shared/lib/styles"
import { useGiftCards, type EstadoGiftCard, type GiftCard } from "../api/giftCards.api"
import DetalleGiftCard from "../components/DetalleGiftCard"
import VenderGiftCard from "../components/VenderGiftCard"

const pestanas: { value: EstadoGiftCard | undefined; label: string }[] = [
  { value: "activa", label: "Activas" },
  { value: "pendiente_pago", label: "Esperando pago" },
  { value: "anulada", label: "Anuladas" },
  { value: undefined, label: "Todas" },
]

function Estado({ g }: { g: GiftCard }) {
  if (g.estado === "pendiente_pago") return <span className="rounded-full bg-cream-dark px-2.5 py-1 text-xs text-ink-soft">Esperando el pago</span>
  if (g.estado === "anulada") return <span className="rounded-full bg-peligro-claro px-2.5 py-1 text-xs text-peligro">Anulada</span>
  if (g.saldo === 0) return <span className="rounded-full bg-cream-dark px-2.5 py-1 text-xs text-ink-soft">Usada</span>
  return <span className="rounded-full bg-rose/40 px-2.5 py-1 text-xs font-medium text-forest">Activa</span>
}

/** Gift cards: venderlas en el local, buscarlas por código o nombre, ver su saldo y sus movimientos. */
export default function GiftCardsPage() {
  const [estado, setEstado] = useState<EstadoGiftCard | undefined>("activa")
  const [busqueda, setBusqueda] = useState("")
  const [vendiendo, setVendiendo] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const { datos, cargando, error, recargar } = useGiftCards({ estado, q: busqueda.trim() || undefined })

  return (
    <div>
      <PageHeader
        withPeriod={false}
        title="Gift cards"
        description="Las que se vendieron en la web y en el local. Se usan en la tienda online (con el código) o en la caja, eligiendo «Gift card» al cobrar."
        action={
          !vendiendo && (
            <button type="button" onClick={() => setVendiendo(true)} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
              + Vender gift card
            </button>
          )
        }
      />

      {vendiendo && (
        <Panel title="Vender una gift card" className="mb-6">
          <VenderGiftCard onVendida={recargar} onCerrar={() => setVendiendo(false)} />
        </Panel>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-cream-dark p-1" role="tablist">
          {pestanas.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={estado === t.value}
              onClick={() => setEstado(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${estado === t.value ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por código o nombre…"
          aria-label="Buscar gift cards"
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
          {datos?.length === 0 && <li className="px-5 py-12 text-center text-sm text-ink-soft">No hay gift cards para mostrar.</li>}
          {datos?.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                aria-expanded={abierta === g.id}
                onClick={() => setAbierta(abierta === g.id ? null : g.id)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 text-left transition hover:bg-cream-dark/40 sm:px-5"
              >
                <span className="w-28 shrink-0 font-mono text-base font-semibold tracking-wider text-ink">{g.codigo}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{g.para ? `Para ${g.para}` : g.comprador.nombre}</span>
                  <span className="block text-sm text-ink-soft">
                    {g.para ? `De ${g.comprador.nombre} · ` : ""}
                    {g.origen === "web" ? "web" : "local"}
                  </span>
                </span>
                <Estado g={g} />
                <span className="w-36 shrink-0 text-right tabular-nums">
                  <span className="font-medium text-ink">{formatPrice(g.saldo)}</span>
                  <span className="text-sm text-ink-soft"> de {formatPrice(g.monto)}</span>
                </span>
              </button>
              {abierta === g.id && (
                <div className="px-4 pb-4 sm:px-5">
                  <DetalleGiftCard id={g.id} onCambio={recargar} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
