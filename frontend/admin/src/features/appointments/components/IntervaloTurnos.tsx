import { useState } from "react"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../../settings/api/ajustes.api"

const intervalos = [10, 15, 20, 30, 60]

/** Cada cuántos minutos la web ofrece horarios (9:00, 9:15… o 9:00, 9:30…). */
export default function IntervaloTurnos() {
  const config = useConfiguracion()

  return (
    <Panel title="Cada cuánto se ofrecen turnos" description="Con 15 minutos, la web ofrece 9:00, 9:15, 9:30… Con 30, 9:00, 9:30…">
      {config.error ? (
        <ErrorCarga mensaje={config.error} onReintentar={config.recargar} alto="h-24" />
      ) : !config.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Selector inicial={Number(config.datos.intervalo_turnos_min) || 15} />
      )}
    </Panel>
  )
}

function Selector({ inicial }: { inicial: number }) {
  const [guardado, setGuardado] = useState(inicial)
  const [intervalo, setIntervalo] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarConfiguracion({ intervalo_turnos_min: intervalo })
      setGuardado(intervalo)
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="intervalo" className={`${labelClass} text-base`}>Ofrecer horarios cada</label>
        <select
          id="intervalo"
          value={intervalo}
          onChange={(e) => {
            setIntervalo(Number(e.target.value))
            setListo(false)
          }}
          className={`${inputClass} w-48 py-3 text-base`}
        >
          {(intervalos.includes(intervalo) ? intervalos : [...intervalos, intervalo].sort((a, b) => a - b)).map((m) => (
            <option key={m} value={m}>
              {m === 60 ? "1 hora" : `${m} minutos`}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => void guardar()} disabled={guardando || intervalo === guardado} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      {listo && <p className="text-base text-ink" role="status">✅ Guardado</p>}
      {error && (
        <p className="w-full rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
