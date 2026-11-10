import { formatPrice } from "@dp/shared/lib/format"

type Linea = { productoId: number; nombre: string; cantidad: number; subtotal: number }

/** Qué llevó y cuánto fue, con los precios que guardó el backend. Con gift card, lo que cubrió y lo que quedó por pagar. */
export default function ResumenDePedido({ items, total, envio, giftCard = 0 }: { items: Linea[]; total: number; envio?: { costo: number } | null; giftCard?: number }) {
  return (
    <>
      <ul className="mt-8 divide-y divide-cream-dark text-left text-sm">
        {items.map((i) => (
          <li key={i.productoId} className="flex justify-between gap-4 py-2.5">
            <span className="text-ink">
              {i.nombre} <span className="text-ink-soft">× {i.cantidad}</span>
            </span>
            <span className="text-ink-soft">{formatPrice(i.subtotal)}</span>
          </li>
        ))}
        {envio && (
          <li className="flex justify-between gap-4 py-2.5">
            <span className="text-ink">Envío a domicilio</span>
            <span className="text-ink-soft">{envio.costo ? formatPrice(envio.costo) : "Gratis"}</span>
          </li>
        )}
      </ul>
      <div className="mt-2 flex justify-between border-t border-cream-dark pt-4 text-left">
        <span className="font-display font-semibold text-ink">Total</span>
        <span className="font-display text-lg font-semibold text-ink">{formatPrice(total)}</span>
      </div>
      {giftCard > 0 && (
        <div className="mt-2 space-y-1 text-left text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Pagado con gift card</span>
            <span>− {formatPrice(giftCard)}</span>
          </div>
          <div className="flex justify-between font-medium text-ink">
            <span>A pagar</span>
            <span>{formatPrice(Math.max(0, total - giftCard))}</span>
          </div>
        </div>
      )}
    </>
  )
}
