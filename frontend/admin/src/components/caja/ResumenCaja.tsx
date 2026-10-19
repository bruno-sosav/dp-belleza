import { formatPrice } from "@dp/shared/lib/format"
import { MEDIOS } from "../../lib/medios"
import type { DiaDeCaja } from "../../data/caja"

/** El total del día, grande, y abajo cuánto entró por cada medio de pago (solo los que tuvieron movimiento). */
export default function ResumenCaja({ totales }: { totales: DiaDeCaja["totales"] }) {
  const conMovimiento = MEDIOS.filter((m) => totales.porMedio[m.valor] > 0)
  return (
    <div>
      <p className="text-base text-ink-soft">Entró en total</p>
      <p className="font-display text-4xl font-semibold text-ink">{formatPrice(totales.total)}</p>
      {conMovimiento.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {conMovimiento.map((m) => (
            <li key={m.valor} className="rounded-xl border border-cream-dark bg-surface px-4 py-3">
              <p className="text-sm text-ink-soft">
                {m.icono} {m.label}
              </p>
              <p className="text-xl font-semibold text-ink">{formatPrice(totales.porMedio[m.valor])}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
