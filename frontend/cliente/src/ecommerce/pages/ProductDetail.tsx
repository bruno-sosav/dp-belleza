import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useAllProducts } from "../data/productStore"
import { formatPrice } from "../lib/format"
import StarRating from "../components/StarRating"
import ProductCard from "../components/ProductCard"
import { useCart } from "../context/CartContext"

const tabs = ["Descripción", "Cómo usar", "Reseñas"] as const

export default function ProductDetail() {
  const { id } = useParams()
  const allProducts = useAllProducts()
  const product = allProducts.find((p) => p.id === id)
  const { addItem } = useCart()
  const [size, setSize] = useState(product?.sizes?.[0])
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<(typeof tabs)[number]>("Descripción")

  // Un producto dado de baja se trata como no disponible, aunque siga en la base.
  if (!product || !product.active) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl text-ink">
          {product ? "Este producto ya no está disponible" : "Producto no encontrado"}
        </h1>
        <Link to="/tienda" className="mt-4 inline-block text-rose-dark hover:underline">
          Volver a la tienda
        </Link>
      </div>
    )
  }

  const related = allProducts
    .filter((p) => p.active && p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6 text-xs uppercase tracking-wide text-ink-soft">
        <Link to="/" className="hover:text-rose">Inicio</Link> / <Link to="/tienda" className="hover:text-rose">Tienda</Link> / {product.name}
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-xl bg-cream-dark">
            <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={`${product.image}?thumb=${i}`}
                alt=""
                className="aspect-square rounded-lg object-cover opacity-80 outline outline-1 outline-transparent transition hover:opacity-100 hover:outline-rose"
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-rose-dark">{product.category}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{product.name}</h1>

          <div className="mt-3">
            <StarRating rating={product.rating} reviews={product.reviews} />
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-2xl font-semibold text-ink">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-ink-soft line-through">{formatPrice(product.oldPrice)}</span>
            )}
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.description}</p>

          {product.sizes && (
            <div className="mt-6">
              <p className="text-sm font-medium text-ink">Tamaño</p>
              <div className="mt-2 flex gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-md border px-4 py-2 text-sm transition ${
                      size === s ? "border-ink bg-ink text-cream" : "border-cream-dark text-ink-soft hover:border-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-cream-dark">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2.5 text-ink-soft hover:text-ink"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="px-3.5 py-2.5 text-ink-soft hover:text-ink">
                +
              </button>
            </div>

            <button
              onClick={() => addItem(product, size)}
              className="flex-1 rounded-md bg-ink py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
            >
              Agregar al carrito
            </button>

            <button
              aria-label="Agregar a favoritos"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cream-dark text-ink-soft transition hover:border-rose hover:text-rose"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.5 1 4 2.5.5-1.5 2-2.5 4-2.5 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20z" />
              </svg>
            </button>
          </div>

          <div className="mt-6 space-y-2 rounded-lg bg-cream-dark/60 p-4 text-xs text-ink-soft">
            <p>✓ Envío gratis en compras superiores a $30.000</p>
            <p>✓ Cambios y devoluciones dentro de los 30 días</p>
            <p>✓ Pago seguro con tarjetas y billeteras virtuales</p>
          </div>

          <div className="mt-10 border-t border-cream-dark pt-6">
            <div className="flex gap-6 border-b border-cream-dark">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
                    tab === t ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="pt-4 text-sm leading-relaxed text-ink-soft">
              {tab === "Descripción" && <p>{product.description}</p>}
              {tab === "Cómo usar" && (
                <p>
                  Aplicar sobre piel limpia y seca. Se recomienda su uso diario, preferentemente por la mañana
                  y/o noche según el producto. Evitar contacto con los ojos.
                </p>
              )}
              {tab === "Reseñas" && (
                <p>{product.reviews} clientas calificaron este producto con un promedio de {product.rating} / 5.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 font-display text-2xl font-semibold text-ink">También te puede interesar</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
