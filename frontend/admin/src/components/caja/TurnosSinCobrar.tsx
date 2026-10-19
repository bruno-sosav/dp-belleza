import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import FormCobro from "./FormCobro"
import { registrarCobro } from "../../data/caja"
import type { SinCobrar } from "../../data/caja"

/** Turnos que se completaron ese día y todavía no se cobraron enteros. Cada uno con su botón "Cobrar". */
export default function TurnosSinCobrar({ turnos, onCambio }: { turnos: SinCobrar[]; onCambio: () => void }) {
  const [cobrando, setCobrando] = useState<number | null>(null)
  if (!turnos.length) return null

  return (
    <ul className="divide-y divide-cream-dark">
      {turnos.map((t) => (
        <li key={t.turnoId} className="py-3">
          {cobrando === t.turnoId ? (
            <FormCobro
              montoSugerido={t.falta}
              detalle={`${t.cliente.nombre} · ${t.servicio} · precio ${formatPrice(t.precio)}${t.cobrado ? ` · ya pagó ${formatPrice(t.cobrado)}` : ""}`}
              onGuardar={async (cobro) => {
                await registrarCobro({ ...cobro, concepto: "turno", turnoId: t.turnoId })
                setCobrando(null)
                onCambio()
              }}
              onCancelar={() => setCobrando(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-14 shrink-0 text-base tabular-nums text-ink-soft">{t.hora}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-ink">{t.cliente.nombre}</p>
                <p className="text-sm text-ink-soft">{t.servicio}</p>
              </div>
              <span className="text-base font-semibold text-ink">Falta {formatPrice(t.falta)}</span>
              <button type="button" onClick={() => setCobrando(t.turnoId)} className="min-h-12 rounded-xl bg-ink px-5 text-base font-semibold text-cream hover:bg-rose-dark">
                Cobrar
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
