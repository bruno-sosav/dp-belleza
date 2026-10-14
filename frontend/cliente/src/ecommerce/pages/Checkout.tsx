import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/format"

export default function Checkout() {
  const { items, subtotal } = useCart()
  const shipping = subtotal > 30000 || subtotal === 0 ? 0 : 2500

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink">Checkout</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Esta pantalla es una demostración visual. La conexión con pagos y envíos se integrará cuando el backend esté disponible.
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">1. Datos de contacto</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input placeholder="Nombre" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Apellido" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Email" type="email" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none sm:col-span-2" />
              <input placeholder="Teléfono" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none sm:col-span-2" />
            </div>
          </section>

          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">2. Dirección de envío</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input placeholder="Calle y número" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none sm:col-span-2" />
              <input placeholder="Ciudad" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Provincia" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Código postal" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="País" defaultValue="Argentina" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
            </div>
          </section>

          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">3. Método de pago</h2>
            <div className="mt-4 space-y-3">
              {["Tarjeta de crédito / débito", "Transferencia bancaria", "Billetera virtual"].map((method, i) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-cream-dark px-4 py-3 text-sm has-[:checked]:border-ink"
                >
                  <input type="radio" name="payment" defaultChecked={i === 0} className="accent-ink" />
                  {method}
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input placeholder="Número de tarjeta" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none sm:col-span-2" />
              <input placeholder="Vencimiento (MM/AA)" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
              <input placeholder="CVV" className="rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none" />
            </div>
          </section>
        </div>

        <div className="h-fit rounded-lg border border-cream-dark bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Resumen del pedido</h2>

          <ul className="mt-4 space-y-3">
            {items.length === 0 && <p className="text-sm text-ink-soft">No hay productos en el carrito.</p>}
            {items.map((item) => (
              <li key={`${item.product.id}-${item.size ?? ""}`} className="flex items-center gap-3">
                <img src={item.product.image} alt={item.product.name} className="h-14 w-11 rounded object-cover" />
                <div className="flex-1">
                  <p className="text-sm text-ink">{item.product.name}</p>
                  <p className="text-xs text-ink-soft">Cant. {item.quantity}</p>
                </div>
                <span className="text-sm text-ink-soft">{formatPrice(item.product.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

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

          <button
            type="button"
            disabled
            title="Disponible cuando el backend esté conectado"
            className="mt-6 w-full cursor-not-allowed rounded-md bg-ink/40 py-3 text-center text-sm font-medium text-cream"
          >
            Confirmar compra
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            El pago se habilitará al integrar el backend.
          </p>

          <Link to="/carrito" className="mt-4 block text-center text-sm text-rose-dark hover:underline">
            ← Volver al carrito
          </Link>
        </div>
      </div>
    </div>
  )
}
