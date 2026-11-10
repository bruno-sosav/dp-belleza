import { useState, type FormEvent } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { useNegocio } from "../../../shared/lib/negocio"
import { whatsappUrl } from "../../home/lib/whatsapp"
import { Field, inputClass } from "../../ecommerce/components/SeccionEntrega"
import { comprarGiftCard, linkDePagoGiftCard, MONTO_MAXIMO, MONTO_MINIMO, MONTOS_SUGERIDOS } from "../api/giftCards.api"
import TarjetaDeRegalo from "../components/TarjetaDeRegalo"

/** "$ 25.000" o "25000" → 25000. */
const aNumero = (texto: string) => Number(texto.replace(/\D/g, ""))

/** Gift cards: elegir el monto, para quién y un mensaje, y pagar con Mercado Pago. El código llega al volver. */
export default function GiftCardsPage() {
  const negocio = useNegocio()
  const [monto, setMonto] = useState(20000)
  const [otroMonto, setOtroMonto] = useState("")
  const [datos, setDatos] = useState({ nombre: "", telefono: "", email: "", para: "", mensaje: "" })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elegido = otroMonto ? aNumero(otroMonto) : monto
  const montoValido = elegido >= MONTO_MINIMO && elegido <= MONTO_MAXIMO
  const online = negocio?.mercadoPago ?? false

  async function comprar(e: FormEvent) {
    e.preventDefault()
    if (!montoValido) return setError(`El monto tiene que ser entre ${formatPrice(MONTO_MINIMO)} y ${formatPrice(MONTO_MAXIMO)}.`)
    setError(null)
    setEnviando(true)
    try {
      const { pagoToken } = await comprarGiftCard({
        monto: elegido,
        comprador: { nombre: datos.nombre.trim(), telefono: datos.telefono.trim(), ...(datos.email.trim() ? { email: datos.email.trim() } : {}) },
        ...(datos.para.trim() ? { para: datos.para.trim() } : {}),
        ...(datos.mensaje.trim() ? { mensaje: datos.mensaje.trim() } : {}),
      })
      window.location.assign((await linkDePagoGiftCard(pagoToken)).link)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ocurrió un error inesperado. Probá de nuevo.")
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.2em] text-leaf">Para regalar</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Gift cards</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Regalá un momento para ella: la gift card se usa en la tienda online o en el local, para servicios y productos. Si no la gasta toda de una vez, el
        saldo le queda para la próxima.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <TarjetaDeRegalo monto={montoValido ? elegido : null} para={datos.para} mensaje={datos.mensaje} />

        {online ? (
          <form onSubmit={comprar} className="space-y-6 rounded-lg border border-cream-dark bg-surface p-6">
            <fieldset>
              <legend className="mb-2 text-sm text-ink-soft">Monto</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MONTOS_SUGERIDOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={!otroMonto && monto === m}
                    onClick={() => {
                      setMonto(m)
                      setOtroMonto("")
                    }}
                    className={`rounded-md border px-3 py-2.5 text-sm transition ${
                      !otroMonto && monto === m ? "border-forest bg-forest text-cream" : "border-cream-dark text-ink hover:border-forest"
                    }`}
                  >
                    {formatPrice(m)}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Otro monto">
                  <input inputMode="numeric" placeholder="Ej: 25000" value={otroMonto} onChange={(e) => setOtroMonto(e.target.value)} className={inputClass} />
                </Field>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Para (opcional)">
                <input maxLength={100} placeholder="Ej: Sofi" value={datos.para} onChange={(e) => setDatos({ ...datos, para: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Tu nombre *">
                <input required maxLength={100} autoComplete="name" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Tu WhatsApp *">
                <input
                  required
                  type="tel"
                  minLength={6}
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="223 15 123-4567"
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Tu email">
                <input type="email" maxLength={150} autoComplete="email" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Mensaje (opcional)">
              <textarea rows={3} maxLength={300} value={datos.mensaje} onChange={(e) => setDatos({ ...datos, mensaje: e.target.value })} className={inputClass} />
            </Field>

            {error && (
              <p role="alert" className="rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-ink">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-sm bg-forest py-3 text-sm font-medium text-cream transition hover:bg-forest-soft disabled:cursor-wait disabled:opacity-60"
            >
              {enviando ? "Abriendo Mercado Pago…" : `Comprar por ${montoValido ? formatPrice(elegido) : "…"}`}
            </button>
            <p className="text-center text-xs text-ink-soft">Pagás con Mercado Pago y al volver te mostramos el código para regalar.</p>
          </form>
        ) : (
          <div className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Pedila por WhatsApp o en el local</h2>
            <p className="mt-2 text-sm text-ink-soft">Por ahora las gift cards se compran en el local o por WhatsApp. Contanos el monto y para quién es, y te la preparamos.</p>
            {negocio?.telefono && (
              <a
                href={whatsappUrl(negocio.telefono, "¡Hola! Quiero comprar una gift card.")}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block rounded-sm bg-forest px-6 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft"
              >
                Escribinos por WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
