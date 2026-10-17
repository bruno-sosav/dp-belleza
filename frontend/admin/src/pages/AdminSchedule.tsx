import { useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import TurnosParaAvisar from "../components/turnos/TurnosParaAvisar"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { ApiError } from "../lib/api"
import { describirBloqueo } from "../lib/bloqueos"
import { sumarDias } from "../lib/fechas"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import { useAhora } from "../lib/useAhora"
import { crearBloqueo, guardarHorarios, quitarBloqueo, useBloqueos, useHorarios } from "../data/horarios"
import type { Horario } from "../data/horarios"
import type { Turno } from "../data/turnos"

const campo = `${inputClass} py-3 text-base`
const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

type Franja = { desde: string; hasta: string }
/** Índice 0 = lunes … 6 = domingo. Un día sin franjas está cerrado. */
type Semana = Franja[][]

function aSemana(horarios: Horario[]): Semana {
  return dias.map((_, i) =>
    horarios
      .filter((h) => h.diaSemana === i + 1)
      .sort((a, b) => a.desde.localeCompare(b.desde))
      .map(({ desde, hasta }) => ({ desde, hasta })),
  )
}

const aFranjas = (semana: Semana): Horario[] =>
  semana.flatMap((franjas, i) => franjas.map((f) => ({ diaSemana: i + 1, ...f })))

/**
 * Horario de atención y días cerrados (/turnos/horario).
 *
 * Es lo que decide qué horarios ofrece la web. Ninguno de los dos cancela
 * turnos: si un cambio deja turnos pedidos afuera, se listan con el botón de
 * WhatsApp para avisarle a cada clienta.
 */
export default function AdminSchedule() {
  const horarios = useHorarios()

  return (
    <div>
      <PageHeader
        title="Horario y días cerrados"
        description="Lo que cargues acá es lo que la web ofrece para reservar."
        withPeriod={false}
        action={
          <Link to="/turnos" className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
            ← Volver a turnos
          </Link>
        }
      />

      <div className="space-y-6">
        <Panel title="Horario de atención" description="Los días y horas en que atendés todas las semanas.">
          {horarios.error ? (
            <ErrorCarga mensaje={horarios.error} onReintentar={horarios.recargar} />
          ) : !horarios.datos ? (
            <Cargando />
          ) : (
            <EditorHorario horarios={horarios.datos} />
          )}
        </Panel>

        <Bloqueos />
      </div>
    </div>
  )
}

function EditorHorario({ horarios }: { horarios: Horario[] }) {
  /** Lo último guardado: contra eso se compara para saber si hay cambios. */
  const [original, setOriginal] = useState<Semana>(() => aSemana(horarios))
  const [semana, setSemana] = useState<Semana>(original)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Turno[] | null>(null)

  const cambiado = JSON.stringify(semana) !== JSON.stringify(original)

  const cambiarDia = (i: number, franjas: Franja[]) => {
    setSemana((s) => s.map((f, j) => (j === i ? franjas : f)))
    setResultado(null)
  }

  async function guardar() {
    if (semana.some((franjas) => franjas.some((f) => !f.desde || !f.hasta))) {
      setError("Completá todas las horas (o tocá “Cerrado” en los días que no atendés).")
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const { horarios: guardado, turnosFuera } = await guardarHorarios(aFranjas(semana))
      const nueva = aSemana(guardado)
      setOriginal(nueva)
      setSemana(nueva)
      setResultado(turnosFuera)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el horario.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <ul className="divide-y divide-cream-dark">
        {semana.map((franjas, i) => {
          const abierto = franjas.length > 0
          return (
            <li key={dias[i]} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
              <div className="flex items-center justify-between gap-3 sm:w-56 sm:shrink-0">
                <p className="text-lg font-semibold text-ink">{dias[i]}</p>
                <button
                  type="button"
                  onClick={() => cambiarDia(i, abierto ? [] : [{ desde: "09:00", hasta: "19:00" }])}
                  aria-pressed={abierto}
                  className={`min-h-12 rounded-xl px-4 text-base font-semibold transition ${
                    abierto ? "bg-[#dcf2e3] text-[#14532d] hover:bg-[#c6ead2]" : "bg-cream-dark text-ink-soft hover:text-ink"
                  }`}
                >
                  {abierto ? "Abierto" : "Cerrado"}
                </button>
              </div>

              {abierto && (
                <div className="flex-1 space-y-2">
                  {franjas.map((f, k) => (
                    <div key={k} className="flex flex-wrap items-center gap-2 text-base text-ink">
                      <span>de</span>
                      <input
                        type="time"
                        step={900}
                        aria-label={`${dias[i]}: abre a las`}
                        value={f.desde}
                        onChange={(e) => cambiarDia(i, franjas.map((x, j) => (j === k ? { ...x, desde: e.target.value } : x)))}
                        className={`${campo} w-auto`}
                      />
                      <span>a</span>
                      <input
                        type="time"
                        step={900}
                        aria-label={`${dias[i]}: cierra a las`}
                        value={f.hasta}
                        onChange={(e) => cambiarDia(i, franjas.map((x, j) => (j === k ? { ...x, hasta: e.target.value } : x)))}
                        className={`${campo} w-auto`}
                      />
                      {franjas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => cambiarDia(i, franjas.filter((_, j) => j !== k))}
                          className="min-h-12 px-2 text-base text-rose-dark underline underline-offset-4 hover:text-ink"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                  {franjas.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ultima = franjas[franjas.length - 1]
                        cambiarDia(i, [...franjas, { desde: ultima.hasta, hasta: ultima.hasta < "20:00" ? "20:00" : "23:00" }])
                      }}
                      className="min-h-11 text-base text-rose-dark underline underline-offset-4 hover:text-ink"
                    >
                      + Agregar otro horario ese día (por ejemplo, si cerrás al mediodía)
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="mt-4 rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}

      {resultado && (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
            ✅ Se guardó el horario.
          </p>
          <TurnosParaAvisar turnos={resultado} motivo="que quedaron fuera del horario nuevo" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void guardar()} disabled={!cambiado || guardando} className={`${primaryButtonClass} min-h-12 px-8 text-base`}>
          {guardando ? "Guardando…" : "Guardar horario"}
        </button>
        {cambiado && !guardando && (
          <button type="button" onClick={() => setSemana(original)} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
            Deshacer cambios
          </button>
        )}
      </div>
    </div>
  )
}

/** Días cerrados por única vez: feriados, vacaciones, un trámite. */
function Bloqueos() {
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
  const [afectados, setAfectados] = useState<Turno[] | null>(null)

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
