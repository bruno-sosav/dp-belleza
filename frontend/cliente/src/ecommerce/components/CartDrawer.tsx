import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/format"

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal } = useCart()

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-cream-dark px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Tu carrito ({items.length})</h2>
          <button type="button" onClick={closeCart} aria-label="Cerrar carrito" className="text-ink-soft hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-ink-soft">Tu carrito está vacío.</p>
            <Link
              to="/tienda"
              onClick={closeCart}
              className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-rose-dark"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={`${item.product.id}-${item.size ?? ""}`} className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-20 w-16 rounded-md object-cover"
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-sm leading-tight text-ink">{item.product.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id, item.size)}
                          aria-label="Quitar producto"
                          className="text-ink-soft hover:text-rose"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                      {item.size && <p className="text-xs text-ink-soft">Talle/Tamaño: {item.size}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-cream-dark">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)}
                            className="px-2.5 py-1 text-ink-soft hover:text-ink"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size)}
                            className="px-2.5 py-1 text-ink-soft hover:text-ink"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-medium text-ink">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-cream-dark px-5 py-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-display text-lg font-semibold text-ink">{formatPrice(subtotal)}</span>
              </div>
              <p className="mb-4 text-xs text-ink-soft">Envío e impuestos calculados en el checkout.</p>
              <Link
                to="/carrito"
                onClick={closeCart}
                className="block w-full rounded-md border border-ink py-2.5 text-center text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"
              >
                Ver carrito
              </Link>
              <Link
                to="/checkout"
                onClick={closeCart}
                className="mt-2 block w-full rounded-md bg-ink py-2.5 text-center text-sm font-medium text-cream transition hover:bg-rose-dark"
              >
                Finalizar compra
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
