import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { etiquetaMedio } from "../lib/medios"
import { borrarCobro } from "../api/caja.api"
import type { Cobro } from "../api/caja.api"
import Icono from "../../../shared/components/Icono"

const conceptos = { sena: "Seña", turno: "Turno", pedido: "Tienda", gift_card: "Venta de gift card", otro: "Otro" }

/** Lo que entró en el día, del más nuevo al más viejo. Se puede borrar uno anotado por error (menos los de Mercado Pago y la venta de una gift card). */
export default function ListaCobros({ cobros, onCambio }: { cobros: Cobro[]; onCambio: () => void }) {
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function borrar(id: number) {
    setError(null)
    try {
      await borrarCobro(id)
      setConfirmando(null)
      onCambio()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo borrar.")
    }
  }

  if (!cobros.length) return <p className="py-6 text-center text-base text-ink-soft">Todavía no entró nada este día.</p>

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-peligro-claro px-3 py-2 text-base text-peligro" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-cream-dark">
        {cobros.map((c) => {
          const medio = etiquetaMedio(c.medio)
          const quien = c.cliente?.nombre ?? c.descripcion ?? "—"
          const que = c.turno ? `${c.turno.servicio} · turno del ${c.turno.fecha.slice(8)}/${c.turno.fecha.slice(5, 7)} ${c.turno.hora}` : c.descripcion && c.cliente ? c.descripcion : null
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-14 shrink-0 text-base tabular-nums text-ink-soft">{c.fechaHora.slice(11)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-ink">
                  {quien} <span className="font-normal text-ink-soft">· {conceptos[c.concepto]}</span>
                </p>
                {que && <p className="text-sm text-ink-soft">{que}</p>}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                <Icono nombre={medio.icono} className="h-4 w-4" />
                {medio.label}
              </span>
              <span className="w-28 text-right text-lg font-semibold tabular-nums text-ink">{formatPrice(c.monto)}</span>
              {c.medio !== "mercadopago" && c.concepto !== "gift_card" &&
                (confirmando === c.id ? (
                  <span className="flex gap-2">
                    <button type="button" onClick={() => void borrar(c.id)} className="min-h-11 rounded-lg bg-peligro px-3 text-sm font-semibold text-white">
                      Sí, borrar
                    </button>
                    <button type="button" onClick={() => setConfirmando(null)} className="min-h-11 px-2 text-sm text-ink-soft underline">
                      No
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmando(c.id)} className="min-h-11 px-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink" aria-label={`Borrar el cobro de ${quien}`}>
                    Borrar
                  </button>
                ))}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
