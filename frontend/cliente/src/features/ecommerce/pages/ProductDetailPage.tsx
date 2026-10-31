import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { useProducto, useProductos } from "../api/catalogo.api"
import ProductCard from "../components/ProductCard"
import ProductImage from "../components/ProductImage"
import { LoadError, Loading } from "../components/LoadState"
import { useCart } from "../context/CartContext"

export default function ProductDetailPage() {
  const { id } = useParams()
  const { data: product, loading, error, reload } = useProducto(id)
  const productos = useProductos()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)

  if (loading) return <Loading text="Cargando producto…" />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadError message={error} onRetry={reload} />
      </div>
    )
  }

  // No existe o está dado de baja: el backend solo devuelve los activos.
  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl text-ink">Este producto no está disponible</h1>
        <Link to="/tienda" className="mt-4 inline-block text-rose-dark hover:underline">
          Volver a la tienda
        </Link>
      </div>
    )
  }

  const related = (productos.data ?? [])
    .filter((p) => p.disponible && p.id !== product.id && p.categoria?.id === product.categoria?.id)
    .slice(0, 4)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6 text-xs uppercase tracking-wide text-ink-soft">
        <Link to="/" className="hover:text-rose">Inicio</Link> / <Link to="/tienda" className="hover:text-rose">Tienda</Link> / {product.nombre}
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-cream-dark">
          <ProductImage src={product.imagenUrl} alt={product.nombre} className="aspect-[4/5] w-full" />
        </div>

        <div>
          {product.categoria && (
            <Link
              to={`/tienda?categoria=${encodeURIComponent(product.categoria.nombre)}`}
              className="text-xs uppercase tracking-wide text-rose-dark hover:underline"
            >
              {product.categoria.nombre}
            </Link>
          )}
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{product.nombre}</h1>

          <p className="mt-4 font-display text-2xl font-semibold text-ink">{formatPrice(product.precio)}</p>

          {product.descripcion && (
            <p className="mt-5 max-w-md whitespace-pre-line text-sm leading-relaxed text-ink-soft">{product.descripcion}</p>
          )}

          {product.disponible ? (
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
                onClick={() => addItem(product, quantity)}
                className="flex-1 rounded-md bg-ink py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
              >
                Agregar al carrito
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-md bg-cream-dark/60 px-4 py-3 text-sm text-ink-soft">
              Sin stock por ahora. Escribinos por WhatsApp y te avisamos cuando vuelva.
            </p>
          )}
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
