import { useState } from "react"
import TurnosParaAvisar from "./TurnosParaAvisar"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { guardarHorarios } from "../api/agenda.api"
import type { Horario } from "../api/agenda.api"
import type { TurnoParaAvisar } from "../api/agenda.api"

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
 * El horario de la semana: un renglón por día, Abierto/Cerrado, y una o más
 * franjas (para cerrar al mediodía). Se guarda la semana entera de una vez.
 *
 * No cancela turnos: si el horario nuevo deja turnos pedidos afuera, se listan
 * con el botón de WhatsApp para avisarle a cada clienta.
 */
export default function EditorHorario({ horarios }: { horarios: Horario[] }) {
  /** Lo último guardado: contra eso se compara para saber si hay cambios. */
  const [original, setOriginal] = useState<Semana>(() => aSemana(horarios))
  const [semana, setSemana] = useState<Semana>(original)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<TurnoParaAvisar[] | null>(null)

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
