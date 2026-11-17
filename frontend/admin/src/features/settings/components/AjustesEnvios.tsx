import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import AvisoOk from "../../../shared/components/AvisoOk"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion, useConfiguracion, type Configuracion } from "../api/ajustes.api"

type Modo = "desactivado" | "prueba" | "andreani"

const modos: { valor: Modo; titulo: string; detalle: string }[] = [
  { valor: "desactivado", titulo: "Sin envíos", detalle: "Los pedidos se retiran en el local." },
  { valor: "prueba", titulo: "Modo prueba", detalle: "Simula a Andreani: tarifas y seguimiento de mentira, para probar la tienda." },
  { valor: "andreani", titulo: "Andreani", detalle: "Cotiza y despacha con la cuenta del local (cargala abajo)." },
]

/** Cómo envía la tienda: modo, envío gratis, desde dónde se despacha y el peso para cotizar. */
export default function AjustesEnvios({ cuentaCargada }: { cuentaCargada: boolean }) {
  const config = useConfiguracion()
  return (
    <Panel title="Envíos de la tienda" description="Con envíos activados, la clienta elige envío a domicilio en el checkout y paga el costo junto con los productos.">
      {config.error ? (
        <ErrorCarga mensaje={config.error} onReintentar={config.recargar} alto="h-24" />
      ) : !config.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Formulario inicial={config.datos} cuentaCargada={cuentaCargada} />
      )}
    </Panel>
  )
}

function Formulario({ inicial, cuentaCargada }: { inicial: Configuracion; cuentaCargada: boolean }) {
  const [modo, setModo] = useState<Modo>((inicial.envio_modo as Modo) || "desactivado")
  const [gratisDesde, setGratisDesde] = useState(inicial.envio_gratis_desde || "0")
  const [cpOrigen, setCpOrigen] = useState(inicial.envio_cp_origen ?? "")
  const [peso, setPeso] = useState(inicial.envio_peso_unidad_g || "300")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    setListo(false)
    try {
      await guardarConfiguracion({ envio_modo: modo, envio_gratis_desde: Number(gratisDesde), envio_cp_origen: cpOrigen.trim(), envio_peso_unidad_g: Number(peso) })
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-5">
      <fieldset className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <legend className={labelClass}>Modo</legend>
        {modos.map((m) => (
          <label key={m.valor} className="flex cursor-pointer gap-3 rounded-xl border border-ink/15 p-4 has-[:checked]:border-leaf has-[:checked]:bg-leaf/5">
            <input type="radio" name="modo" checked={modo === m.valor} onChange={() => setModo(m.valor)} className="mt-1 accent-leaf" />
            <span>
              <span className="block font-medium text-ink">{m.titulo}</span>
              <span className="block text-sm text-ink-soft">{m.detalle}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {modo === "andreani" && !cuentaCargada && (
        <p className="rounded-xl border border-alerta/40 bg-alerta-claro px-4 py-3 text-sm text-ink">
          Falta cargar la cuenta de Andreani: hasta entonces la tienda no ofrece envíos.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="gratis" className={labelClass}>Envío gratis desde ($)</label>
          <input id="gratis" type="number" min={0} value={gratisDesde} onChange={(e) => setGratisDesde(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-ink-soft">{Number(gratisDesde) > 0 ? `Compras de ${formatPrice(Number(gratisDesde))} o más no pagan envío.` : "0 = el envío siempre se cobra."}</p>
        </div>
        <div>
          <label htmlFor="cp" className={labelClass}>Código postal de origen</label>
          <input id="cp" inputMode="numeric" maxLength={4} placeholder="7600" value={cpOrigen} onChange={(e) => setCpOrigen(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="peso" className={labelClass}>Peso por producto (gramos)</label>
          <input id="peso" type="number" min={1} value={peso} onChange={(e) => setPeso(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-ink-soft">Se usa para cotizar el paquete.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void guardar()} disabled={guardando} className={primaryButtonClass}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {listo && <AvisoOk>Guardado</AvisoOk>}
      </div>
      {error && (
        <p className="rounded-lg bg-peligro-claro px-3 py-2 text-sm text-peligro" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
