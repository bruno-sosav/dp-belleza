import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { categoriesOf } from "@dp/shared/data/services"
import type { Service } from "@dp/shared/data/services"
import { formatPrice } from "@dp/shared/lib/format"
import FormularioCliente from "../clientes/FormularioCliente"
import { Cargando, ErrorCarga } from "../EstadoCarga"
import { ApiError } from "../../lib/api"
import { formatLongDate, formatTelefono } from "../../lib/format"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../lib/styles"
import type { Ahora } from "../../lib/useAhora"
import { nombreCompleto, useClientes } from "../../data/clientes"
import type { Cliente } from "../../data/clientes"
import { useHorariosLibres, useServicios } from "../../data/servicios"
import { crearTurno } from "../../data/turnos"
import type { Turno } from "../../data/turnos"

const opcionClass =
  "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-cream-dark bg-surface px-4 py-3 text-left text-base text-ink transition hover:border-rose-dark hover:bg-rose/10"
const campo = `${inputClass} py-3 text-base`

/** "75" → "1 h 15 min" */
function duracion(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Dar un turno desde el panel: le escribieron por WhatsApp, la llamaron, o se
 * lo pidieron en el local.
 *
 * Tres preguntas, una debajo de la otra, y cada una aparece recién cuando la
 * anterior está respondida: ¿para quién?, ¿qué servicio?, ¿qué día y a qué
 * hora? Lo ya elegido queda como un renglón con "Cambiar", así la dueña ve
 * siempre lo que va a guardar.
 *
 * Los horarios son los mismos que vería una clienta en la web (ya descuentan
 * turnos tomados y bloqueos). Si hace falta darlo fuera del horario de
 * atención, hay un botón aparte que lo dice con todas las letras.
 */
export default function NuevoTurno({
  fechaInicial,
  horaInicial,
  ahora,
  onCreado,
  onCerrar,
}: {
  fechaInicial: string
  /** Cuando se abre tocando un hueco del calendario. */
  horaInicial?: string
  ahora: Ahora
  onCreado: (turno: Turno) => void
  onCerrar: () => void
}) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [servicio, setServicio] = useState<Service | null>(null)
  const [fecha, setFecha] = useState(fechaInicial)
  const [hora, setHora] = useState<string | null>(horaInicial ?? null)
  const [fueraDeHorario, setFueraDeHorario] = useState(false)
  const [horaLibre, setHoraLibre] = useState(horaInicial ?? "")
  const [notas, setNotas] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const libres = useHorariosLibres(servicio?.id ?? null, fecha)
  const disponibles = (libres.datos ?? []).filter((h) => h.available).map((h) => h.time)

  // La hora que viene de tocar el calendario puede no servir para el servicio
  // elegido (no entra antes del cierre, o se pisa con otro turno): en ese caso
  // simplemente no queda elegida, sin un efecto que la borre.
  const horaElegida = fueraDeHorario ? (horaLibre || null) : hora && disponibles.includes(hora) ? hora : null

  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => e.key === "Escape" && !guardando && onCerrar()
    document.addEventListener("keydown", alApretar)
    return () => document.removeEventListener("keydown", alApretar)
  }, [onCerrar, guardando])

  async function guardar() {
    if (!cliente || !servicio || !horaElegida) return
    setGuardando(true)
    setError(null)
    try {
      const turno = await crearTurno({
        clienteId: cliente.id,
        servicioId: servicio.id,
        fecha,
        hora: horaElegida,
        notas: notas.trim() || undefined,
        fueraDeHorario,
      })
      onCreado(turno)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el turno.")
      // Si alguien tomó el horario mientras tanto, se actualiza la lista.
      if (err instanceof ApiError && err.status === 409) libres.recargar()
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={() => !guardando && onCerrar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-turno-titulo"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="nuevo-turno-titulo" className="font-display text-2xl font-semibold text-ink">
            Nuevo turno
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl text-ink-soft hover:bg-cream-dark hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. Clienta */}
          <Paso numero={1} titulo="¿Para quién es?">
            {cliente ? (
              <Elegido onCambiar={() => setCliente(null)}>
                <span className="font-semibold">{nombreCompleto(cliente)}</span>
                <span className="text-ink-soft"> · {formatTelefono(cliente.telefono)}</span>
              </Elegido>
            ) : (
              <ElegirCliente onElegir={setCliente} />
            )}
          </Paso>

          {/* 2. Servicio */}
          {cliente && (
            <Paso numero={2} titulo="¿Qué servicio?">
              {servicio ? (
                <Elegido onCambiar={() => setServicio(null)}>
                  <span className="font-semibold">{servicio.name}</span>
                  <span className="text-ink-soft"> · {duracion(servicio.durationMin)} · {formatPrice(servicio.price)}</span>
                </Elegido>
              ) : (
                <ElegirServicio onElegir={setServicio} />
              )}
            </Paso>
          )}

          {/* 3. Día y hora */}
          {cliente && servicio && (
            <Paso numero={3} titulo="¿Qué día y a qué hora?">
              <label htmlFor="nt-fecha" className={`${labelClass} text-base`}>Día</label>
              <input
                id="nt-fecha"
                type="date"
                min={ahora.fecha}
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
                className={`${campo} max-w-xs`}
              />
              <p className="mt-1.5 text-base text-ink-soft first-letter:uppercase">{formatLongDate(fecha)}</p>

              {fueraDeHorario ? (
                <div className="mt-5 rounded-xl border border-[#e0b44a] bg-[#fdf3dc] p-4">
                  <label htmlFor="nt-hora" className={`${labelClass} text-base`}>Hora (fuera del horario de atención)</label>
                  <input
                    id="nt-hora"
                    type="time"
                    step={900}
                    value={horaLibre}
                    onChange={(e) => setHoraLibre(e.target.value)}
                    className={`${campo} max-w-[10rem]`}
                  />
                  <p className="mt-2 text-sm text-ink-soft">
                    Igual no deja pisar otro turno. Dura {duracion(servicio.durationMin)}.
                  </p>
                  <button type="button" onClick={() => setFueraDeHorario(false)} className="mt-3 text-base text-rose-dark underline underline-offset-4 hover:text-ink">
                    Volver a los horarios libres
                  </button>
                </div>
              ) : (
                <div className="mt-5">
                  <p className={`${labelClass} text-base`}>Horarios libres</p>
                  {libres.error ? (
                    <ErrorCarga mensaje={libres.error} onReintentar={libres.recargar} alto="h-32" />
                  ) : libres.cargando ? (
                    <Cargando alto="h-32" />
                  ) : disponibles.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {disponibles.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHora(h)}
                          aria-pressed={h === horaElegida}
                          className={`min-h-12 rounded-xl border text-base font-semibold tabular-nums transition ${
                            h === horaElegida ? "border-ink bg-ink text-cream" : "border-cream-dark bg-surface text-ink hover:border-rose-dark"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-cream-dark/60 px-4 py-5 text-base text-ink-soft">
                      Ese día no quedan horarios libres para este servicio (o el local está cerrado).
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFueraDeHorario(true)
                      setHoraLibre(horaElegida ?? horaLibre)
                    }}
                    className="mt-3 text-base text-rose-dark underline underline-offset-4 hover:text-ink"
                  >
                    Darlo en otro horario
                  </button>
                </div>
              )}

              <label htmlFor="nt-notas" className={`${labelClass} mt-5 text-base`}>
                Nota <span className="font-normal text-ink-soft">(opcional)</span>
              </label>
              <textarea
                id="nt-notas"
                rows={2}
                maxLength={1000}
                placeholder="Ej: viene con la hija, prefiere aceite sin perfume…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={`${campo} resize-none`}
              />
            </Paso>
          )}

          {error && (
            <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
              {error}
            </p>
          )}

          {cliente && servicio && horaElegida && (
            <div className="rounded-xl border border-cream-dark bg-surface p-4">
              <p className="text-base text-ink">
                <span className="font-semibold">{nombreCompleto(cliente)}</span> · {servicio.name}
              </p>
              <p className="mt-0.5 text-base text-ink first-letter:uppercase">
                {formatLongDate(fecha)} a las <span className="font-semibold">{horaElegida}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={!cliente || !servicio || !horaElegida || guardando}
              className={`${primaryButtonClass} min-h-12 px-6 text-base`}
            >
              {guardando ? "Guardando…" : "Agendar turno"}
            </button>
            <button type="button" onClick={onCerrar} disabled={guardando} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-3 font-display text-lg font-semibold text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose/30 text-base text-rose-dark">{numero}</span>
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Elegido({ children, onCambiar }: { children: ReactNode; onCambiar: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink/15 bg-surface px-4 py-3">
      <p className="text-base">{children}</p>
      <button type="button" onClick={onCambiar} className="min-h-12 shrink-0 px-2 text-base text-rose-dark underline underline-offset-4 hover:text-ink">
        Cambiar
      </button>
    </div>
  )
}

/** Busca entre las clientas, o da de alta una nueva sin salir del turno. */
function ElegirCliente({ onElegir }: { onElegir: (cliente: Cliente) => void }) {
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [nueva, setNueva] = useState(false)

  // Se espera a que deje de escribir para no pedir una lista por cada letra.
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(id)
  }, [texto])

  const clientes = useClientes(busqueda)

  if (nueva) {
    return <FormularioCliente onGuardado={onElegir} onCancelar={() => setNueva(false)} />
  }

  const lista = (clientes.datos ?? []).slice(0, 6)

  return (
    <div>
      <label htmlFor="nt-buscar" className="sr-only">Buscar clienta</label>
      <input
        id="nt-buscar"
        type="search"
        autoFocus
        placeholder="Escribí el nombre o el teléfono"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={campo}
      />
      <div className="mt-3 space-y-2">
        {clientes.error ? (
          <ErrorCarga mensaje={clientes.error} onReintentar={clientes.recargar} alto="h-24" />
        ) : !clientes.datos ? (
          <Cargando alto="h-24" />
        ) : lista.length ? (
          lista.map((c) => (
            <button key={c.id} type="button" onClick={() => onElegir(c)} className={opcionClass}>
              <span className="font-semibold">{nombreCompleto(c)}</span>
              <span className="text-ink-soft tabular-nums">{formatTelefono(c.telefono)}</span>
            </button>
          ))
        ) : (
          <p className="px-1 py-2 text-base text-ink-soft">No hay ninguna clienta con “{busqueda}”.</p>
        )}
      </div>
      <button type="button" onClick={() => setNueva(true)} className={`${secondaryButtonClass} mt-3 min-h-12 px-5 text-base`}>
        + Es una clienta nueva
      </button>
    </div>
  )
}

/** Los servicios agrupados por categoría, como botones grandes. */
function ElegirServicio({ onElegir }: { onElegir: (servicio: Service) => void }) {
  const servicios = useServicios()

  const lista = servicios.datos
  if (servicios.error) return <ErrorCarga mensaje={servicios.error} onReintentar={servicios.recargar} alto="h-24" />
  if (!lista) return <Cargando alto="h-24" />
  if (!lista.length) {
    return <p className="text-base text-ink-soft">Todavía no hay servicios cargados.</p>
  }

  const categorias = categoriesOf(lista)

  return (
    <div className="space-y-4">
      {categorias.map((categoria) => (
        <div key={categoria}>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-soft">{categoria}</p>
          <div className="space-y-2">
            {lista
              .filter((s) => s.category === categoria)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => onElegir(s)} className={opcionClass}>
                  <span className="font-semibold">{s.name}</span>
                  <span className="shrink-0 text-ink-soft">
                    {duracion(s.durationMin)} · {formatPrice(s.price)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
