import { formatPrice } from "@dp/shared/lib/format"

type Linea = { productoId: number; nombre: string; cantidad: number; subtotal: number }

/** Qué llevó y cuánto fue, con los precios que guardó el backend. */
export default function ResumenDePedido({ items, total }: { items: Linea[]; total: number }) {
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
      </ul>
      <div className="mt-2 flex justify-between border-t border-cream-dark pt-4 text-left">
        <span className="font-display font-semibold text-ink">Total</span>
        <span className="font-display text-lg font-semibold text-ink">{formatPrice(total)}</span>
      </div>
    </>
  )
}
