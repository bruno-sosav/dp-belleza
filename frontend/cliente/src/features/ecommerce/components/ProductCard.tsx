import { Link } from "react-router-dom"
import type { Producto } from "@dp/shared/types/producto.types"
import { formatPrice } from "@dp/shared/lib/format"
import { useCart } from "../context/CartContext"
import ProductImage from "./ProductImage"

export default function ProductCard({ product }: { product: Producto }) {
  const { addItem } = useCart()

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded bg-cream-dark">
        <Link to={`/producto/${product.id}`}>
          <ProductImage
            src={product.imagenUrl}
            alt={product.nombre}
            className={`aspect-[4/5] w-full transition duration-700 ease-soft group-hover:scale-[1.06] ${product.disponible ? "" : "opacity-60"}`}
          />
        </Link>

        {!product.disponible && (
          <span className="absolute left-3 top-3 rounded-sm bg-forest px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-cream">
            Agotado
          </span>
        )}

        {product.disponible && (
          <button
            type="button"
            onClick={() => addItem(product)}
            className="absolute inset-x-3 bottom-3 translate-y-3 rounded-sm bg-forest py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-cream opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            Agregar al carrito
          </button>
        )}
      </div>

      <Link to={`/producto/${product.id}`} className="mt-3">
        {product.categoria && (
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-bark">{product.categoria.nombre}</p>
        )}
        <h3 className="mt-1 font-display text-xl font-medium leading-tight text-ink">{product.nombre}</h3>
      </Link>

      <span className="mt-1.5 font-semibold text-ink">{formatPrice(product.precio)}</span>
    </div>
  )
}
