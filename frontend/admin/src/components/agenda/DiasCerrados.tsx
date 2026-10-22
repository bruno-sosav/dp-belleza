import { useState } from "react"
import type { FormEvent } from "react"
import Panel from "../../shared/components/Panel"
import TurnosParaAvisar from "../turnos/TurnosParaAvisar"
import { Cargando, ErrorCarga } from "../../shared/components/EstadoCarga"
import { ApiError } from "../../shared/lib/api"
import { describirBloqueo } from "../../lib/bloqueos"
import { sumarDias } from "../../shared/lib/fechas"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../shared/lib/styles"
import { useAhora } from "../../shared/lib/useAhora"
import { crearBloqueo, quitarBloqueo, useBloqueos } from "../../data/horarios"
import type { TurnoParaAvisar } from "../../data/horarios"

const campo = `${inputClass} py-3 text-base`

/** Días cerrados por única vez: feriados, vacaciones, un trámite. */
export default function DiasCerrados() {
  const ahora = useAhora()
  const bloqueos = useBloqueos()
  const [desde, setDesde] = useState(ahora.fecha)
  const [hasta, setHasta] = useState(ahora.fecha)
  const [todoElDia, setTodoElDia] = useState(true)
  const [horaDesde, setHoraDesde] = useState("09:00")
  const [horaHasta, setHoraHasta] = useState("13:00")
  const [motivo, setMotivo] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [afectados, setAfectados] = useState<TurnoParaAvisar[] | null>(null)

  async function agregar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setAfectados(null)
    try {
      const { turnosAfectados } = await crearBloqueo(
        todoElDia
          ? // Días enteros: de las 00:00 del primero a las 00:00 del día después del último.
            { desde: `${desde} 00:00`, hasta: `${sumarDias(hasta < desde ? desde : hasta, 1)} 00:00`, motivo: motivo.trim() || undefined }
          : { desde: `${desde} ${horaDesde}`, hasta: `${desde} ${horaHasta}`, motivo: motivo.trim() || undefined },
      )
      setAfectados(turnosAfectados)
      setMotivo("")
      bloqueos.recargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(id: number) {
    setError(null)
    try {
      await quitarBloqueo(id)
      bloqueos.recargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar.")
    }
  }

  return (
    <Panel title="Días cerrados" description="Feriados, vacaciones o un rato puntual. Esos horarios dejan de aparecer en la web.">
      <form onSubmit={agregar} className="rounded-xl bg-cream-dark/50 p-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Qué cerrar">
          {[
            { valor: true, label: "Uno o varios días enteros" },
            { valor: false, label: "Unas horas de un día" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={todoElDia === o.valor}
              onClick={() => setTodoElDia(o.valor)}
              className={`min-h-12 rounded-xl border px-4 text-base transition ${
                todoElDia === o.valor ? "border-ink bg-ink text-cream" : "border-cream-dark bg-surface text-ink hover:border-rose-dark"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="bl-desde" className={`${labelClass} text-base`}>{todoElDia ? "Desde el día" : "Día"}</label>
            <input
              id="bl-desde"
              type="date"
              required
              min={ahora.fecha}
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                if (hasta < e.target.value) setHasta(e.target.value)
              }}
              className={campo}
            />
          </div>
          {todoElDia ? (
            <div>
              <label htmlFor="bl-hasta" className={`${labelClass} text-base`}>Hasta el día (inclusive)</label>
              <input id="bl-hasta" type="date" required min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
            </div>
          ) : (
            <div className="flex items-end gap-2 text-base text-ink">
              <div>
                <label htmlFor="bl-hdesde" className={`${labelClass} text-base`}>De</label>
                <input id="bl-hdesde" type="time" step={900} required value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} className={campo} />
              </div>
              <div>
                <label htmlFor="bl-hhasta" className={`${labelClass} text-base`}>a</label>
                <input id="bl-hhasta" type="time" step={900} required value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} className={campo} />
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="bl-motivo" className={`${labelClass} text-base`}>
              Motivo <span className="font-normal text-ink-soft">(opcional, solo lo ves vos)</span>
            </label>
            <input id="bl-motivo" maxLength={255} placeholder="Ej: Feriado, vacaciones, turno médico" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} />
          </div>
        </div>

        <button type="submit" disabled={guardando} className={`${primaryButtonClass} mt-4 min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : "Cerrar en esas fechas"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
      {afectados && (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
            ✅ Listo, esos horarios ya no se ofrecen en la web.
          </p>
          <TurnosParaAvisar turnos={afectados} motivo="en esas fechas" />
        </div>
      )}

      <h3 className="mt-6 font-display text-lg font-semibold text-ink">Próximos días cerrados</h3>
      {bloqueos.error ? (
        <ErrorCarga mensaje={bloqueos.error} onReintentar={bloqueos.recargar} alto="h-24" />
      ) : !bloqueos.datos ? (
        <Cargando alto="h-24" />
      ) : bloqueos.datos.length === 0 ? (
        <p className="py-4 text-base text-ink-soft">No hay ninguno cargado.</p>
      ) : (
        <ul className="mt-2 divide-y divide-cream-dark">
          {bloqueos.datos.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-ink first-letter:uppercase">{describirBloqueo(b)}</p>
                {b.motivo && <p className="text-sm text-ink-soft">{b.motivo}</p>}
              </div>
              <button type="button" onClick={() => void quitar(b.id)} className={`${secondaryButtonClass} min-h-12 px-4 text-base`}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
