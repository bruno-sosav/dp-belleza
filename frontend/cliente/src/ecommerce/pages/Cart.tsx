import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/format"

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Tu carrito está vacío</h1>
        <p className="mt-2 text-ink-soft">Explorá nuestro catálogo y encontrá tu próximo producto favorito.</p>
        <Link
          to="/tienda"
          className="mt-6 inline-block rounded-md bg-ink px-7 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  const shipping = subtotal > 30000 ? 0 : 2500

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">Carrito de compras</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-cream-dark pb-3 text-xs uppercase tracking-wide text-ink-soft sm:grid">
            <span>Producto</span>
            <span>Precio</span>
            <span>Cantidad</span>
            <span className="text-right">Total</span>
          </div>

          <ul className="divide-y divide-cream-dark">
            {items.map((item) => (
              <li
                key={`${item.product.id}-${item.size ?? ""}`}
                className="grid grid-cols-1 items-center gap-4 py-5 sm:grid-cols-[2fr_1fr_1fr_1fr]"
              >
                <div className="flex items-center gap-4">
                  <img src={item.product.image} alt={item.product.name} className="h-20 w-16 rounded-md object-cover" />
                  <div>
                    <Link to={`/producto/${item.product.id}`} className="font-display text-sm font-medium text-ink hover:text-rose">
                      {item.product.name}
                    </Link>
                    {item.size && <p className="text-xs text-ink-soft">Tamaño: {item.size}</p>}
                    <button
                      onClick={() => removeItem(item.product.id, item.size)}
                      className="mt-1 text-xs text-ink-soft underline hover:text-rose"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <span className="text-sm text-ink-soft">{formatPrice(item.product.price)}</span>

                <div className="flex items-center rounded-md border border-cream-dark w-fit">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)}
                    className="px-3 py-1.5 text-ink-soft hover:text-ink"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size)}
                    className="px-3 py-1.5 text-ink-soft hover:text-ink"
                  >
                    +
                  </button>
                </div>

                <span className="text-right font-medium text-ink">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Link to="/tienda" className="mt-6 inline-block text-sm text-rose-dark hover:underline">
            ← Seguir comprando
          </Link>
        </div>

        <div className="h-fit rounded-lg border border-cream-dark bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Resumen del pedido</h2>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Código de descuento"
              className="w-full rounded-md border border-cream-dark px-3 py-2 text-sm outline-none"
            />
            <button className="shrink-0 rounded-md border border-ink px-4 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream">
              Aplicar
            </button>
          </div>

          <div className="mt-5 space-y-2 border-t border-cream-dark pt-4 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Envío</span>
              <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t border-cream-dark pt-4">
            <span className="font-display font-semibold text-ink">Total</span>
            <span className="font-display text-lg font-semibold text-ink">{formatPrice(subtotal + shipping)}</span>
          </div>

          <Link
            to="/checkout"
            className="mt-6 block w-full rounded-md bg-ink py-3 text-center text-sm font-medium text-cream transition hover:bg-rose-dark"
          >
            Finalizar compra
          </Link>
        </div>
      </div>
    </div>
  )
}
