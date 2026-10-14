import { Link } from "react-router-dom"
import type { Product } from "../data/products"
import { formatPrice } from "../lib/format"
import StarRating from "./StarRating"
import { useCart } from "../context/CartContext"

const badgeStyles: Record<string, string> = {
  Nuevo: "bg-ink text-cream",
  Oferta: "bg-rose text-white",
  Bestseller: "bg-cream-dark text-ink",
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-lg bg-cream-dark">
        <Link to={`/producto/${product.id}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${badgeStyles[product.badge]}`}
          >
            {product.badge}
          </span>
        )}

        <button
          type="button"
          aria-label="Agregar a favoritos"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-soft opacity-0 transition duration-300 hover:text-rose group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.5 1 4 2.5.5-1.5 2-2.5 4-2.5 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => addItem(product)}
          className="absolute inset-x-3 bottom-3 translate-y-3 rounded-md bg-ink py-2.5 text-xs font-medium uppercase tracking-wide text-cream opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          Agregar al carrito
        </button>
      </div>

      <Link to={`/producto/${product.id}`} className="mt-3">
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">{product.category}</p>
        <h3 className="mt-0.5 font-display text-base text-ink">{product.name}</h3>
      </Link>

      <div className="mt-1">
        <StarRating rating={product.rating} reviews={product.reviews} />
      </div>

      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-medium text-ink">{formatPrice(product.price)}</span>
        {product.oldPrice && (
          <span className="text-sm text-ink-soft line-through">{formatPrice(product.oldPrice)}</span>
        )}
      </div>
    </div>
  )
}
