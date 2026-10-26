import { useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { cardClass, inputClass, primaryButtonClass } from "../../../shared/lib/styles"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { cambiarActivo, useProductosAdmin, type ProductoAdmin } from "../api/catalogo.api"
import { ajustarStock } from "../api/inventario.api"

type Filter = "active" | "inactive" | "all"

const mensajeDe = (err: unknown) => (err instanceof ApiError ? err.message : "No se pudo guardar. Probá de nuevo.")

/** El stock de un producto, con un botón para corregirlo (lo que se contó en el local). */
function Stock({ producto, onCambio }: { producto: ProductoAdmin; onCambio: () => void }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(producto.stock))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await ajustarStock(producto.id, Number(valor))
      setEditando(false)
      onCambio()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(String(producto.stock))
          setEditando(true)
        }}
        title="Corregir el stock"
        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition hover:ring-1 hover:ring-ink/30 ${
          producto.stock === 0 ? "bg-red-50 text-red-700" : "bg-cream-dark text-ink"
        }`}
      >
        {producto.stock === 0 ? "Sin stock" : `${producto.stock} u.`}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={1}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label={`Stock de ${producto.nombre}`}
          className={`${inputClass} w-20 py-1 text-sm`}
          autoFocus
        />
        <button type="button" onClick={() => setEditando(false)} className="px-2 py-1 text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || valor === "" || !Number.isInteger(Number(valor)) || Number(valor) < 0}
          onClick={guardar}
          className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-cream disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}

export default function ProductsPage() {
  const { datos, cargando, error, recargar } = useProductosAdmin()
  const location = useLocation()
  const justAdded = (location.state as { added?: string } | null)?.added

  const [filter, setFilter] = useState<Filter>("active")
  const [search, setSearch] = useState("")
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const products = useMemo(() => datos ?? [], [datos])

  const counts = {
    active: products.filter((p) => p.activo).length,
    inactive: products.filter((p) => !p.activo).length,
    all: products.length,
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products
      .filter((p) => (filter === "all" ? true : filter === "active" ? p.activo : !p.activo))
      .filter(
        (p) => !term || p.nombre.toLowerCase().includes(term) || (p.categoria?.nombre.toLowerCase().includes(term) ?? false),
      )
  }, [products, filter, search])

  const setActivo = async (id: number, activo: boolean) => {
    setErrorAccion(null)
    try {
      await cambiarActivo(id, activo)
      setConfirmingId(null)
      recargar()
    } catch (err) {
      setErrorAccion(mensajeDe(err))
    }
  }

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
            Tocá el stock para corregirlo.
          </p>
        </div>
        <Link to="/productos/nuevo" className={primaryButtonClass}>
          + Agregar producto
        </Link>
      </div>

      {justAdded && (
        <p className="mt-6 rounded-lg border border-rose/40 bg-rose/15 px-4 py-3 text-sm text-ink">
          ✓ Se agregó <strong>{justAdded}</strong>. Ya aparece en la tienda.
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorAccion}
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

      {!datos && cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : (
        <ul className={`${cardClass} mt-4 divide-y divide-cream-dark`}>
          {visible.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-ink-soft">No hay productos para mostrar.</li>
          )}

          {visible.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-5">
              {p.imagenUrl ? (
                <img
                  src={p.imagenUrl}
                  alt=""
                  className={`h-16 w-14 shrink-0 rounded-md object-cover ${p.activo ? "" : "opacity-40 grayscale"}`}
                />
              ) : (
                <div className="h-16 w-14 shrink-0 rounded-md bg-cream-dark" />
              )}

              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${p.activo ? "text-ink" : "text-ink-soft line-through"}`}>{p.nombre}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {p.categoria?.nombre ?? "Sin categoría"} · {formatPrice(p.precio)}
                </p>
              </div>

              <Stock producto={p} onCambio={recargar} />

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  p.activo ? "bg-rose/25 text-rose-dark" : "bg-cream-dark text-ink-soft"
                }`}
              >
                {p.activo ? "Activo" : "De baja"}
              </span>

              <div className="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
                {!p.activo ? (
                  <button
                    type="button"
                    onClick={() => setActivo(p.id, true)}
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
                      onClick={() => setActivo(p.id, false)}
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
      )}
    </div>
  )
}
