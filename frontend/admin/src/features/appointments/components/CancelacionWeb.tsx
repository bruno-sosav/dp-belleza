import { useState } from "react"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../../settings/api/ajustes.api"

const opciones = [
  { horas: 0, label: "Hasta que empiece el turno" },
  { horas: 2, label: "Hasta 2 horas antes" },
  { horas: 6, label: "Hasta 6 horas antes" },
  { horas: 12, label: "Hasta 12 horas antes" },
  { horas: 24, label: "Hasta 1 día antes" },
  { horas: 48, label: "Hasta 2 días antes" },
]

/**
 * Hasta cuándo la clienta puede cancelar sola desde la web ("Mi turno").
 * Después de ese límite, la web le ofrece escribir por WhatsApp.
 */
export default function CancelacionWeb() {
  const config = useConfiguracion()

  return (
    <Panel
      title="Cancelaciones desde la web"
      description="La clienta puede cancelar su turno en la web con el código y su teléfono. Pasado este límite, la web le pide que te escriba por WhatsApp."
    >
      {config.error ? (
        <ErrorCarga mensaje={config.error} onReintentar={config.recargar} alto="h-24" />
      ) : !config.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Selector inicial={Number(config.datos.cancelacion_horas_minimas ?? 24)} />
      )}
    </Panel>
  )
}

function Selector({ inicial }: { inicial: number }) {
  const [guardado, setGuardado] = useState(inicial)
  const [horas, setHoras] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarConfiguracion({ cancelacion_horas_minimas: horas })
      setGuardado(horas)
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
        <label htmlFor="cancelacion" className={`${labelClass} text-base`}>Puede cancelar sola</label>
        <select
          id="cancelacion"
          value={horas}
          onChange={(e) => {
            setHoras(Number(e.target.value))
            setListo(false)
          }}
          className={`${inputClass} w-72 py-3 text-base`}
        >
          {opciones.map((o) => (
            <option key={o.horas} value={o.horas}>
              {o.label}
            </option>
          ))}
          {!opciones.some((o) => o.horas === horas) && <option value={horas}>Hasta {horas} horas antes</option>}
        </select>
      </div>
      <button type="button" onClick={() => void guardar()} disabled={guardando || horas === guardado} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
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
