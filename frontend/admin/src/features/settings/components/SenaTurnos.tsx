import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../api/ajustes.api"

const opciones = [0, 10, 20, 30, 40, 50, 100]

/** Porcentaje de seña al reservar desde la web. Solo aplica con Mercado Pago conectado. */
export default function SenaTurnos({ conectado }: { conectado: boolean }) {
  const config = useConfiguracion()
  return (
    <Panel
      title="Seña de los turnos"
      description="Cuánto del precio paga la clienta al reservar desde la web. Si no la paga en 30 minutos, el horario se libera solo."
    >
      {config.error ? (
        <ErrorCarga mensaje={config.error} onReintentar={config.recargar} alto="h-24" />
      ) : !config.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Selector inicial={Number(config.datos.sena_porcentaje ?? 0)} conectado={conectado} />
      )}
    </Panel>
  )
}

function Selector({ inicial, conectado }: { inicial: number; conectado: boolean }) {
  const [guardado, setGuardado] = useState(inicial)
  const [porcentaje, setPorcentaje] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarConfiguracion({ sena_porcentaje: porcentaje })
      setGuardado(porcentaje)
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sena" className={`${labelClass} text-base`}>Seña al reservar</label>
          <select
            id="sena"
            value={porcentaje}
            onChange={(e) => {
              setPorcentaje(Number(e.target.value))
              setListo(false)
            }}
            className={`${inputClass} w-64 py-3 text-base`}
          >
            {(opciones.includes(porcentaje) ? opciones : [...opciones, porcentaje].sort((a, b) => a - b)).map((p) => (
              <option key={p} value={p}>
                {p === 0 ? "Sin seña" : p === 100 ? "El total (100 %)" : `${p} % del precio`}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void guardar()} disabled={guardando || porcentaje === guardado} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {listo && <p className="text-base text-ink" role="status">✅ Guardado</p>}
      </div>
      {porcentaje > 0 && (
        <p className="text-base text-ink-soft">
          Por ejemplo, en un turno de {formatPrice(24000)} la clienta paga {formatPrice(Math.round((24000 * porcentaje) / 100))} al reservar y el resto en el local.
        </p>
      )}
      {porcentaje > 0 && !conectado && (
        <p className="rounded-xl border border-[#e0b44a] bg-[#fdf3dc] px-4 py-3 text-base text-ink">
          ⚠️ Mercado Pago no está conectado: hasta que lo conectes arriba, la web no cobra seña.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
