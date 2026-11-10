import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { inputClass } from "../../ecommerce/components/SeccionEntrega"
import { consultarSaldo, type SaldoGiftCard } from "../api/giftCards.api"

/** "¿Tenés una gift card?": la clienta escribe el código, se consulta el saldo y queda aplicada. */
export default function GiftCardDelCheckout({ aplicada, onAplicar }: { aplicada: SaldoGiftCard | null; onAplicar: (g: SaldoGiftCard | null) => void }) {
  const [codigo, setCodigo] = useState("")
  const [consultando, setConsultando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function aplicar() {
    if (!codigo.trim()) return
    setConsultando(true)
    setError(null)
    try {
      onAplicar(await consultarSaldo(codigo.trim()))
      setCodigo("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos revisar la gift card. Probá de nuevo.")
    } finally {
      setConsultando(false)
    }
  }

  if (aplicada) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose/15 px-3 py-2.5 text-sm">
        <span className="text-ink">
          Gift card <strong className="font-mono">{aplicada.codigo}</strong> · saldo {formatPrice(aplicada.saldo)}
        </span>
        <button type="button" onClick={() => onAplicar(null)} className="text-leaf underline hover:text-ink">
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="gift-card" className="mb-1 block text-sm text-ink-soft">
        ¿Tenés una gift card?
      </label>
      <div className="flex gap-2">
        <input
          id="gift-card"
          placeholder="XXXX-XXXX"
          maxLength={20}
          autoComplete="off"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void aplicar()
            }
          }}
          className={`${inputClass} font-mono uppercase`}
        />
        <button
          type="button"
          disabled={consultando || !codigo.trim()}
          onClick={() => void aplicar()}
          className="shrink-0 rounded-sm border border-forest/40 px-4 text-sm font-medium text-ink transition hover:bg-forest hover:text-cream disabled:opacity-50"
        >
          {consultando ? "…" : "Aplicar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-rose-dark">
          {error}
        </p>
      )}
    </div>
  )
}
