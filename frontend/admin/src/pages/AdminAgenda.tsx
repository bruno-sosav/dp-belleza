import { useCallback, useState } from "react"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import SemanaGrilla from "../components/agenda/SemanaGrilla"
import ModalTurno from "../components/agenda/ModalTurno"
import TurnoFila from "../components/turnos/TurnoFila"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { fromDateKey, lunesDeSemana, sumarDias } from "../lib/fechas"
import { formatRangoSemana, weekdayShort } from "../lib/format"
import { coloresBloque } from "../lib/agenda"
import { secondaryButtonClass } from "../lib/styles"
import { useAhora } from "../lib/useAhora"
import { useAgenda } from "../data/turnos"
import type { EstadoTurno } from "../data/turnos"
import { useHorarios } from "../data/horarios"

const leyenda: { estado: EstadoTurno; label: string }[] = [
  { estado: "reservado", label: "Reservado" },
  { estado: "confirmado", label: "Confirmado" },
  { estado: "completado", label: "Completado" },
  { estado: "ausente", label: "No vino" },
]

const botonNav = `${secondaryButtonClass} min-h-12 px-4 text-base`

/**
 * Agenda: la semana en un calendario, para que la dueña vea de un vistazo qué
 * turnos tiene, cuándo y a qué hora.
 *
 * En la computadora es una grilla de lunes a domingo. En el celular no entra:
 * se elige el día arriba y abajo se ven los turnos de ese día, con los mismos
 * botones que en la pantalla de Hoy.
 *
 * Los cancelados no se muestran por defecto: liberaron el horario y en la
 * grilla confunden. Se pueden mostrar con el botón de abajo.
 */
export default function AdminAgenda() {
  const ahora = useAhora()
  const [lunes, setLunes] = useState(() => lunesDeSemana(ahora.fecha))
  const [diaMovil, setDiaMovil] = useState(ahora.fecha)
  const [elegidoId, setElegidoId] = useState<number | null>(null)
  const [verCancelados, setVerCancelados] = useState(false)

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const agenda = useAgenda(dias[0], dias[6])
  const horarios = useHorarios()
  const cerrarModal = useCallback(() => setElegidoId(null), [])

  function irASemana(nuevoLunes: string) {
    setLunes(nuevoLunes)
    // En el celular, al cambiar de semana se muestra hoy si cae en esa semana, si no el lunes.
    setDiaMovil(lunesDeSemana(ahora.fecha) === nuevoLunes ? ahora.fecha : nuevoLunes)
  }

  const esEstaSemana = lunes === lunesDeSemana(ahora.fecha)
  const todos = agenda.turnos ?? []
  const cancelados = todos.filter((t) => t.estado === "cancelado").length
  const visibles = verCancelados ? todos : todos.filter((t) => t.estado !== "cancelado")
  const elegido = todos.find((t) => t.id === elegidoId) ?? null
  const delDiaMovil = visibles.filter((t) => t.fecha === diaMovil)

  return (
    <div>
      <PageHeader title="Turnos" description="Tu semana de un vistazo. Tocá un turno para ver el detalle o marcarlo." withPeriod={false} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => irASemana(sumarDias(lunes, -7))} className={botonNav} aria-label="Semana anterior">
          ← <span className="hidden sm:inline">Anterior</span>
        </button>
        <button type="button" onClick={() => irASemana(lunesDeSemana(ahora.fecha))} disabled={esEstaSemana} className={`${botonNav} disabled:opacity-40`}>
          Hoy
        </button>
        <button type="button" onClick={() => irASemana(sumarDias(lunes, 7))} className={botonNav} aria-label="Semana siguiente">
          <span className="hidden sm:inline">Siguiente</span> →
        </button>
        <h2 className="ml-1 font-display text-2xl font-semibold text-ink">{formatRangoSemana(dias[0], dias[6])}</h2>
        {agenda.cargando && agenda.turnos && <span className="text-sm text-ink-soft">Actualizando…</span>}
      </div>

      <Panel>
        {!agenda.turnos && agenda.cargando ? (
          <Cargando alto="h-96" />
        ) : !agenda.turnos ? (
          <ErrorCarga mensaje={agenda.error ?? "No se pudo cargar la agenda."} onReintentar={agenda.recargar} alto="h-96" />
        ) : (
          <>
            {/* Computadora: la semana entera */}
            <div className="hidden md:block">
              <SemanaGrilla dias={dias} turnos={visibles} horarios={horarios.datos ?? []} ahora={ahora} onElegir={(t) => setElegidoId(t.id)} />
            </div>

            {/* Celular: un día a la vez */}
            <div className="md:hidden">
              <div className="-mx-1 mb-4 grid grid-cols-7 gap-1">
                {dias.map((fecha) => {
                  const d = fromDateKey(fecha)
                  const cantidad = visibles.filter((t) => t.fecha === fecha).length
                  const activo = fecha === diaMovil
                  return (
                    <button
                      key={fecha}
                      type="button"
                      onClick={() => setDiaMovil(fecha)}
                      aria-pressed={activo}
                      className={`flex flex-col items-center rounded-xl py-2 transition ${activo ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark"}`}
                    >
                      <span className="text-xs uppercase">{weekdayShort[d.getDay()]}</span>
                      <span className={`text-lg font-semibold ${fecha === ahora.fecha && !activo ? "text-rose-dark" : ""}`}>{d.getDate()}</span>
                      <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${cantidad ? (activo ? "bg-cream" : "bg-rose-dark") : "bg-transparent"}`} />
                    </button>
                  )
                })}
              </div>
              {delDiaMovil.length ? (
                <ul className="space-y-4">
                  {delDiaMovil.map((t) => (
                    <TurnoFila key={t.id} turno={t} ahora={ahora} onCambiarEstado={(estado) => agenda.cambiarEstado(t.id, estado)} />
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-base text-ink-soft">No hay turnos este día.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-cream-dark pt-4">
              {leyenda.map((l) => (
                <span key={l.estado} className="inline-flex items-center gap-2 text-sm text-ink">
                  <span className={`h-4 w-4 rounded border-l-4 ${coloresBloque[l.estado]}`} />
                  {l.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 text-sm text-ink">
                <span className="h-4 w-4 rounded bg-cream-dark" /> Cerrado
              </span>
              {cancelados > 0 && (
                <button type="button" onClick={() => setVerCancelados((v) => !v)} className="ml-auto text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
                  {verCancelados ? "Ocultar cancelados" : `Mostrar ${cancelados} ${cancelados === 1 ? "cancelado" : "cancelados"}`}
                </button>
              )}
            </div>
          </>
        )}
      </Panel>

      {elegido && (
        <ModalTurno
          turno={elegido}
          ahora={ahora}
          onCambiarEstado={(estado) => agenda.cambiarEstado(elegido.id, estado)}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  )
}
