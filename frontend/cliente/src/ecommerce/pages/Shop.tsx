import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { categories } from "../data/products"
import { useProducts } from "../data/productStore"
import ProductCard from "../components/ProductCard"

const sortOptions = [
  { value: "relevance", label: "Relevancia" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "rating", label: "Mejor calificados" },
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get("categoria")
  const [sort, setSort] = useState("relevance")
  const [maxPrice, setMaxPrice] = useState(35000)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const products = useProducts()

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.price <= maxPrice)
    if (activeCategory) list = list.filter((p) => p.category === activeCategory)

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price)
        break
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating)
        break
    }
    return list
  }, [products, activeCategory, sort, maxPrice])

  const setCategory = (c: string | null) => {
    if (!c) {
      searchParams.delete("categoria")
    } else {
      searchParams.set("categoria", c)
    }
    setSearchParams(searchParams)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft">Inicio / Tienda</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
          {activeCategory ?? "Todos los productos"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{filtered.length} productos</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="mb-3 flex w-full items-center justify-between rounded-md border border-cream-dark px-4 py-2.5 text-sm font-medium lg:hidden"
          >
            Filtros
            <span>{filtersOpen ? "−" : "+"}</span>
          </button>

          <div className={`${filtersOpen ? "block" : "hidden"} space-y-8 lg:block`}>
            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Categorías</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => setCategory(null)}
                    className={`transition hover:text-rose ${!activeCategory ? "font-medium text-rose" : "text-ink-soft"}`}
                  >
                    Todas
                  </button>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => setCategory(c)}
                      className={`transition hover:text-rose ${activeCategory === c ? "font-medium text-rose" : "text-ink-soft"}`}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Precio máximo</h3>
              <input
                type="range"
                min={5000}
                max={35000}
                step={500}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-4 w-full accent-rose"
              />
              <p className="mt-1 text-sm text-ink-soft">Hasta ${maxPrice.toLocaleString("es-AR")}</p>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Disponibilidad</h3>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="accent-rose" defaultChecked />
                En stock
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="accent-rose" />
                Agotado
              </label>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-end">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-cream-dark bg-surface px-3 py-2 text-sm text-ink-soft outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  Ordenar por: {o.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="py-20 text-center text-ink-soft">No se encontraron productos con estos filtros.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
