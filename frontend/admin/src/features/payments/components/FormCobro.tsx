import { useState } from "react"
import type { FormEvent } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { MEDIOS } from "../lib/medios"
import type { CobroElegido, MedioPago } from "../lib/medios"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import Icono from "../../../shared/components/Icono"

/**
 * Monto (viene lo que falta, editable) y medio de pago. Lo usan Completado y Caja.
 * `onSinCobrar` muestra "Todavía no cobré": el turno queda en Caja → sin cobrar.
 * Con "Gift card" pide el código: el backend descuenta el saldo (y avisa si no alcanza).
 * `conGiftCard` false la saca (por ejemplo, al vender una gift card: no se paga con otra).
 */
export default function FormCobro({
  montoSugerido,
  detalle,
  textoGuardar = "Guardar cobro",
  onGuardar,
  onSinCobrar,
  onCancelar,
  conGiftCard = true,
}: {
  montoSugerido: number
  /** Una línea arriba del formulario, por ejemplo "Precio $24.000 · seña pagada $7.200". */
  detalle?: string
  textoGuardar?: string
  onGuardar: (cobro: CobroElegido) => Promise<void>
  onSinCobrar?: () => Promise<void>
  onCancelar: () => void
  conGiftCard?: boolean
}) {
  const [monto, setMonto] = useState(montoSugerido > 0 ? String(montoSugerido) : "")
  const [medio, setMedio] = useState<MedioPago | null>(null)
  const [codigo, setCodigo] = useState("")
  const medios = conGiftCard ? MEDIOS : MEDIOS.filter((m) => m.valor !== "gift_card")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function correr(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
    } catch (err) {
      // ApiError trae el motivo del servidor; un Error común, el de quien llamó (por ejemplo, falta un dato).
      setError(err instanceof ApiError || err instanceof Error ? err.message : "No se pudo guardar.")
      setGuardando(false)
    }
  }

  function guardar(e: FormEvent) {
    e.preventDefault()
    // "$ 16.800" o "16800" → 16800. En Argentina el punto es de miles.
    const numero = Number(monto.replace(/[^\d,]/g, "").replace(",", "."))
    if (!numero || numero <= 0) return setError("Poné cuánto cobraste.")
    if (!medio) return setError("Elegí cómo te pagó.")
    if (medio === "gift_card" && !codigo.trim()) return setError("Escribí el código de la gift card.")
    void correr(() => onGuardar({ monto: numero, medio, ...(medio === "gift_card" ? { giftCard: codigo.trim() } : {}) }))
  }

  return (
    <form onSubmit={guardar} className="space-y-4 rounded-xl border border-cream-dark bg-cream p-4">
      {detalle && <p className="text-base text-ink-soft">{detalle}</p>}
      <div>
        <label htmlFor="cobro-monto" className={`${labelClass} text-base`}>¿Cuánto cobraste?</label>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-soft">$</span>
          <input
            id="cobro-monto"
            inputMode="numeric"
            autoFocus
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={`${inputClass} py-3 pl-8 text-lg font-semibold`}
          />
        </div>
        {montoSugerido > 0 && <p className="mt-1 text-sm text-ink-soft">Sugerido: {formatPrice(montoSugerido)}</p>}
      </div>

      <fieldset>
        <legend className={`${labelClass} text-base`}>¿Cómo te pagó?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {medios.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => setMedio(m.valor)}
              aria-pressed={medio === m.valor}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 text-base transition ${
                medio === m.valor ? "border-forest bg-forest text-white" : "border-cream-dark bg-surface text-ink hover:border-rose-dark"
              }`}
            >
              <Icono nombre={m.icono} />
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {medio === "gift_card" && (
        <div className="max-w-xs">
          <label htmlFor="cobro-gift-card" className={`${labelClass} text-base`}>Código de la gift card</label>
          <input
            id="cobro-gift-card"
            placeholder="XXXX-XXXX"
            autoComplete="off"
            maxLength={20}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className={`${inputClass} py-3 font-mono text-lg uppercase`}
          />
          <p className="mt-1 text-sm text-ink-soft">Se descuenta del saldo. No suma a lo que entró hoy: esa plata entró cuando se vendió.</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-peligro-claro px-3 py-2 text-base text-peligro" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : textoGuardar}
        </button>
        {onSinCobrar && (
          <button type="button" disabled={guardando} onClick={() => void correr(onSinCobrar)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
            Todavía no cobré
          </button>
        )}
        <button type="button" disabled={guardando} onClick={onCancelar} className="min-h-12 px-3 text-base text-ink-soft underline underline-offset-4 hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  )
}
