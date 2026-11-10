import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import AvisoOk from "../../../shared/components/AvisoOk"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion } from "../api/ajustes.api"

const opciones = [0, 5, 10, 15, 20, 25, 30]

/** % de descuento en la tienda online durante el mes del cumpleaños de la clienta. 0 = sin descuento. */
export default function DescuentoCumple({ inicial }: { inicial: number }) {
  const [guardado, setGuardado] = useState(inicial)
  const [porcentaje, setPorcentaje] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarConfiguracion({ descuento_cumple_porcentaje: porcentaje })
      setGuardado(porcentaje)
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Panel
      title="Descuento de cumpleaños"
      description="Durante todo el mes de su cumpleaños, la clienta tiene un descuento en los productos de la tienda online (no en el envío). Una compra por año. Solo vale para las que tienen el cumpleaños cargado en su ficha."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="descuento-cumple" className={`${labelClass} text-base`}>Descuento</label>
            <select
              id="descuento-cumple"
              value={porcentaje}
              onChange={(e) => {
                setPorcentaje(Number(e.target.value))
                setListo(false)
              }}
              className={`${inputClass} w-64 py-3 text-base`}
            >
              {(opciones.includes(porcentaje) ? opciones : [...opciones, porcentaje].sort((a, b) => a - b)).map((p) => (
                <option key={p} value={p}>
                  {p === 0 ? "Sin descuento" : `${p} % de los productos`}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => void guardar()} disabled={guardando || porcentaje === guardado} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {listo && <AvisoOk>Guardado</AvisoOk>}
        </div>
        {porcentaje > 0 && (
          <p className="text-base text-ink-soft">
            Por ejemplo, en una compra de {formatPrice(30000)} la clienta que cumple este mes paga {formatPrice(Math.round(30000 * (1 - porcentaje / 100)))}.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-peligro-claro px-3 py-2 text-base text-peligro" role="alert">
            {error}
          </p>
        )}
      </div>
    </Panel>
  )
}
