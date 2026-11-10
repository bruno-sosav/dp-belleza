import { formatPrice } from "@dp/shared/lib/format"
import type { CartItem } from "../lib/carrito"
import ProductImage from "./ProductImage"

/** El costo del envío como se muestra en el resumen: sin cargo, el monto, "Gratis" o "a calcular". */
function textoEnvio(retira: boolean, envio: number | null) {
  if (retira) return "Sin cargo"
  if (envio === null) return "A calcular"
  return envio === 0 ? "Gratis" : formatPrice(envio)
}

/** El aside del checkout: productos, subtotal, envío, gift card y total. `envio` null = todavía sin cotizar. */
export default function ResumenDelCarrito(props: { items: CartItem[]; subtotal: number; retira: boolean; envio: number | null; giftCard: number }) {
  const { items, subtotal, retira, envio, giftCard } = props
  const total = subtotal + (envio ?? 0)
  return (
    <>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.product.id} className="flex items-center gap-3">
            <ProductImage src={item.product.imagenUrl} alt={item.product.nombre} className="h-14 w-11 shrink-0 rounded text-[9px]" />
            <div className="flex-1">
              <p className="text-sm text-ink">{item.product.nombre}</p>
              <p className="text-xs text-ink-soft">Cant. {item.quantity}</p>
            </div>
            <span className="text-sm text-ink-soft">{formatPrice(item.product.precio * item.quantity)}</span>
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
          <span>{textoEnvio(retira, envio)}</span>
        </div>
        {giftCard > 0 && (
          <div className="flex justify-between text-leaf">
            <span>Gift card</span>
            <span>− {formatPrice(Math.min(giftCard, total))}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between border-t border-cream-dark pt-4">
        <span className="font-display font-semibold text-ink">{giftCard > 0 ? "A pagar" : "Total"}</span>
        <span className="font-display text-lg font-semibold text-ink">{formatPrice(Math.max(0, total - giftCard))}</span>
      </div>
    </>
  )
}
