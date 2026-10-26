import { useState } from "react"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../../settings/api/ajustes.api"

const minimos = [
  { horas: 0, label: "Sin mínimo (hasta que empiece)" },
  { horas: 1, label: "1 hora antes" },
  { horas: 2, label: "2 horas antes" },
  { horas: 4, label: "4 horas antes" },
  { horas: 12, label: "12 horas antes" },
  { horas: 24, label: "1 día antes" },
  { horas: 48, label: "2 días antes" },
]
const maximos = [7, 14, 30, 60, 90, 180, 365]

/**
 * Con cuánta anticipación se puede reservar desde la web: como mínimo (que
 * nadie reserve un turno que empieza en 5 minutos) y como máximo (hasta
 * cuántos días para adelante). Los turnos que da la dueña no tienen estas reglas.
 */
export default function AnticipacionReserva() {
  const config = useConfiguracion()
  return (
    <Panel title="Con cuánta anticipación se reserva" description="Solo para las reservas desde la web. Los turnos que das vos desde el panel no tienen este límite.">
      {config.error ? (
        <ErrorCarga mensaje={config.error} onReintentar={config.recargar} alto="h-24" />
      ) : !config.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Formulario minInicial={Number(config.datos.reserva_anticipacion_min_horas ?? 2)} maxInicial={Number(config.datos.reserva_anticipacion_max_dias ?? 60)} />
      )}
    </Panel>
  )
}

function Formulario({ minInicial, maxInicial }: { minInicial: number; maxInicial: number }) {
  const [guardado, setGuardado] = useState({ min: minInicial, max: maxInicial })
  const [min, setMin] = useState(minInicial)
  const [max, setMax] = useState(maxInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await guardarConfiguracion({ reserva_anticipacion_min_horas: min, reserva_anticipacion_max_dias: max })
      setGuardado({ min, max })
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  const campo = `${inputClass} w-72 py-3 text-base`
  const cambio = () => setListo(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="ant-min" className={`${labelClass} text-base`}>Como mínimo</label>
          <select id="ant-min" value={min} onChange={(e) => { setMin(Number(e.target.value)); cambio() }} className={campo}>
            {minimos.map((o) => (
              <option key={o.horas} value={o.horas}>
                {o.label}
              </option>
            ))}
            {!minimos.some((o) => o.horas === min) && <option value={min}>{min} horas antes</option>}
          </select>
        </div>
        <div>
          <label htmlFor="ant-max" className={`${labelClass} text-base`}>Hasta</label>
          <select id="ant-max" value={max} onChange={(e) => { setMax(Number(e.target.value)); cambio() }} className={campo}>
            {(maximos.includes(max) ? maximos : [...maximos, max].sort((a, b) => a - b)).map((d) => (
              <option key={d} value={d}>
                {d === 7 ? "1 semana para adelante" : d === 365 ? "1 año para adelante" : `${d} días para adelante`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void guardar()} disabled={guardando || (min === guardado.min && max === guardado.max)} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {listo && <p className="text-base text-ink" role="status">✅ Guardado</p>}
      </div>
      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
