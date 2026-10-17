import { useState } from "react"
import type { FormEvent } from "react"
import Panel from "./Panel"
import { Cargando, ErrorCarga } from "./EstadoCarga"
import { ApiError } from "../lib/api"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import { desconectar, guardarCredenciales, probarConexion, useMercadoPago } from "../data/mercadopago"

const campo = `${inputClass} py-3 text-base font-mono`
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * Ajustes → Mercado Pago. Conectar la cuenta del local para cobrar online.
 *
 * Las credenciales se pegan una vez: el backend las prueba contra Mercado Pago
 * antes de guardarlas y las guarda cifradas. Después solo se ve la cuenta y
 * los últimos 4 caracteres; para cambiarlas se cargan de nuevo.
 */
export default function PanelMercadoPago() {
  const estado = useMercadoPago()
  const [cargando, setCargando] = useState(false)
  const [accessToken, setAccessToken] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmandoDesconectar, setConfirmandoDesconectar] = useState(false)

  async function correr(accion: () => Promise<unknown>, exito: string) {
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      await accion()
      setAviso(exito)
      estado.recargar()
      return true
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : "No se pudo completar. Probá de nuevo.")
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const ok = await correr(
      () =>
        guardarCredenciales({
          accessToken: accessToken.trim(),
          publicKey: publicKey.trim(),
          ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
        }),
      "✅ Mercado Pago quedó conectado.",
    )
    if (ok) {
      setCargando(false)
      setAccessToken("")
      setPublicKey("")
      setWebhookSecret("")
    }
  }

  const datos = estado.datos

  return (
    <Panel title="Mercado Pago" description="Conectá la cuenta del local para cobrar online.">
      {estado.error ? (
        <ErrorCarga mensaje={estado.error} onReintentar={estado.recargar} alto="h-24" />
      ) : !datos ? (
        <Cargando alto="h-24" />
      ) : (
        <div className="space-y-4">
          {datos.configurada && !cargando ? (
            <div className="rounded-xl border border-cream-dark bg-surface p-4">
              <p className="text-lg font-semibold text-ink">
                ✅ Conectado{datos.cuenta ? ` a ${datos.cuenta}` : ""}
              </p>
              <p className="mt-1 text-base text-ink-soft">
                {datos.modo === "prueba" ? "🧪 Modo prueba: los pagos no son reales." : "💳 Modo producción: los pagos son reales."}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Access Token terminado en <span className="font-mono">…{datos.tokenFinal}</span>
                {datos.verificadaAt && ` · probado el ${datos.verificadaAt.slice(8, 10)}/${datos.verificadaAt.slice(5, 7)} a las ${datos.verificadaAt.slice(11)}`}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Avisos de pago (webhook): {datos.webhookSecretCargado ? "con clave secreta ✅" : "sin clave secreta"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={ocupado} onClick={() => void correr(probarConexion, "✅ La conexión con Mercado Pago anda bien.")} className={`${primaryButtonClass} min-h-12 px-5 text-base`}>
                  {ocupado ? "Probando…" : "Probar conexión"}
                </button>
                <button type="button" disabled={ocupado} onClick={() => setCargando(true)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
                  Cambiar credenciales
                </button>
                <button type="button" disabled={ocupado} onClick={() => setConfirmandoDesconectar(true)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
                  Desconectar
                </button>
              </div>
              {confirmandoDesconectar && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#e9b9b6] bg-[#fbe4e2] p-4">
                  <p className="w-full text-base text-ink sm:w-auto">¿Desconectar Mercado Pago? La web deja de poder cobrar online.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoDesconectar(false)
                      void correr(desconectar, "Mercado Pago quedó desconectado.")
                    }}
                    className="min-h-12 rounded-xl bg-[#c0392b] px-5 text-base font-semibold text-white hover:bg-[#a12b28]"
                  >
                    Sí, desconectar
                  </button>
                  <button type="button" onClick={() => setConfirmandoDesconectar(false)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
                    No
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={guardar} className="space-y-4">
              <div className="rounded-xl bg-cream-dark/60 p-4 text-base text-ink">
                <p className="font-semibold">¿Dónde están las credenciales?</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-ink-soft">
                  <li>
                    Entrá a{" "}
                    <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-rose-dark underline underline-offset-4">
                      Mercado Pago Developers → Tus integraciones
                    </a>{" "}
                    con la cuenta del local.
                  </li>
                  <li>Elegí la aplicación (o creá una) y entrá a “Credenciales de producción”.</li>
                  <li>Copiá la <strong>Public Key</strong> y el <strong>Access Token</strong> y pegalos acá.</li>
                </ol>
                <p className="mt-2 text-sm text-ink-soft">Para probar sin cobrar de verdad, usá las “Credenciales de prueba”.</p>
              </div>

              <div>
                <label htmlFor="mp-public" className={`${labelClass} text-base`}>Public Key</label>
                <input id="mp-public" required autoComplete="off" spellCheck={false} placeholder="APP_USR-…" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} className={campo} />
              </div>
              <div>
                <label htmlFor="mp-token" className={`${labelClass} text-base`}>Access Token</label>
                <input id="mp-token" required type="password" autoComplete="off" spellCheck={false} placeholder="APP_USR-…" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className={campo} />
                <p className="mt-1.5 text-sm text-ink-soft">Es la llave para cobrar en nombre del local: se guarda cifrada y no se vuelve a mostrar.</p>
              </div>
              <details className="rounded-xl border border-cream-dark p-4">
                <summary className="cursor-pointer text-base text-ink">Avisos de pago (opcional, lo configura quien instala la web)</summary>
                <div className="mt-3 space-y-2 text-sm text-ink-soft">
                  <p>
                    En Mercado Pago → Webhooks, poné esta URL y marcá el evento “Pagos”:
                    <br />
                    <span className="font-mono text-ink">{API_URL}/api/mercadopago/webhook</span>
                  </p>
                  <p>Tiene que ser la dirección pública del servidor: en una computadora local Mercado Pago no puede llegar.</p>
                  <label htmlFor="mp-secret" className={`${labelClass} mt-2 text-base`}>Clave secreta del webhook</label>
                  <input id="mp-secret" type="password" autoComplete="off" spellCheck={false} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className={campo} />
                </div>
              </details>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={ocupado} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
                  {ocupado ? "Probando con Mercado Pago…" : "Conectar"}
                </button>
                {datos.configurada && (
                  <button type="button" onClick={() => setCargando(false)} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}

          {error && (
            <p className="rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
              {error}
            </p>
          )}
          {aviso && (
            <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
              {aviso}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}

function mensajeDeError(err: ApiError) {
  const detalle = err.detalle as { campo: string; mensaje: string }[] | undefined
  if (Array.isArray(detalle) && detalle[0]) return `${detalle[0].mensaje}.`
  return err.message
}
