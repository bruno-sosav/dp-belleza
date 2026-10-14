import { useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { setProductActive, useAllProducts } from "../../ecommerce/data/productStore"
import { formatPrice } from "../../ecommerce/lib/format"
import { cardClass, inputClass, primaryButtonClass } from "../lib/styles"

type Filter = "active" | "inactive" | "all"

export default function AdminProducts() {
  const products = useAllProducts()
  const location = useLocation()
  const justAdded = (location.state as { added?: string } | null)?.added

  const [filter, setFilter] = useState<Filter>("active")
  const [search, setSearch] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const counts = {
    active: products.filter((p) => p.active).length,
    inactive: products.filter((p) => !p.active).length,
    all: products.length,
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products
      .filter((p) => (filter === "all" ? true : filter === "active" ? p.active : !p.active))
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
  }, [products, filter, search])

  const tabs: { value: Filter; label: string }[] = [
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Dados de baja" },
    { value: "all", label: "Todos" },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Productos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Los productos dados de baja no se muestran en la tienda, pero no se borran: podés reactivarlos cuando vuelvas a tenerlos.
          </p>
        </div>
        <Link to="/admin/productos/nuevo" className={primaryButtonClass}>
          + Agregar producto
        </Link>
      </div>

      {justAdded && (
        <p className="mt-6 rounded-lg border border-rose/40 bg-rose/15 px-4 py-3 text-sm text-ink">
          ✓ Se agregó <strong>{justAdded}</strong>. Ya aparece en la tienda.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-cream-dark p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={filter === t.value}
              onClick={() => setFilter(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                filter === t.value ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label} <span className="text-ink-soft/70">({counts[t.value]})</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por nombre o categoría…"
          aria-label="Buscar productos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      <ul className={`${cardClass} mt-4 divide-y divide-cream-dark`}>
        {visible.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-ink-soft">No hay productos para mostrar.</li>
        )}

        {visible.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-5">
            <img
              src={p.image}
              alt=""
              className={`h-16 w-14 shrink-0 rounded-md object-cover ${p.active ? "" : "opacity-40 grayscale"}`}
            />

            <div className="min-w-0 flex-1">
              <p className={`truncate font-medium ${p.active ? "text-ink" : "text-ink-soft line-through"}`}>{p.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {p.category} · {formatPrice(p.price)}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                p.active ? "bg-rose/25 text-rose-dark" : "bg-cream-dark text-ink-soft"
              }`}
            >
              {p.active ? "Activo" : "De baja"}
            </span>

            <div className="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
              {!p.active ? (
                <button
                  type="button"
                  onClick={() => setProductActive(p.id, true)}
                  className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm text-ink transition hover:border-ink"
                >
                  Reactivar
                </button>
              ) : confirmingId === p.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductActive(p.id, false)
                      setConfirmingId(null)
                    }}
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-800"
                  >
                    Confirmar baja
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(p.id)}
                  className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm text-ink transition hover:border-red-700 hover:text-red-700"
                >
                  Dar de baja
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
