import { Link } from "react-router-dom"
import type { Producto } from "@dp/shared/types/producto.types"
import { formatPrice } from "@dp/shared/lib/format"
import { useCart } from "../context/CartContext"
import ProductImage from "./ProductImage"

export default function ProductCard({ product }: { product: Producto }) {
  const { addItem } = useCart()

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-lg bg-cream-dark">
        <Link to={`/producto/${product.id}`}>
          <ProductImage
            src={product.imagenUrl}
            alt={product.nombre}
            className={`aspect-[4/5] w-full transition duration-500 group-hover:scale-105 ${product.disponible ? "" : "opacity-60"}`}
          />
        </Link>

        {!product.disponible && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium tracking-wide text-cream">
            Agotado
          </span>
        )}

        {product.disponible && (
          <button
            type="button"
            onClick={() => addItem(product)}
            className="absolute inset-x-3 bottom-3 translate-y-3 rounded-md bg-ink py-2.5 text-xs font-medium uppercase tracking-wide text-cream opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            Agregar al carrito
          </button>
        )}
      </div>

      <Link to={`/producto/${product.id}`} className="mt-3">
        {product.categoria && (
          <p className="text-[11px] uppercase tracking-wide text-ink-soft">{product.categoria.nombre}</p>
        )}
        <h3 className="mt-0.5 font-display text-base text-ink">{product.nombre}</h3>
      </Link>

      <span className="mt-1.5 font-medium text-ink">{formatPrice(product.precio)}</span>
    </div>
  )
}
