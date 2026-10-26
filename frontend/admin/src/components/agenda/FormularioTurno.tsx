import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { categoriesOf } from "@dp/shared/data/services"
import { formatPrice } from "@dp/shared/lib/format"
import FormularioCliente from "../../features/customers/components/FormularioCliente"
import { Cargando, ErrorCarga } from "../../shared/components/EstadoCarga"
import { aMinutos } from "../../lib/agenda"
import { ApiError } from "../../shared/lib/api"
import { formatLongDate, formatTelefono } from "../../shared/lib/format"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../shared/lib/styles"
import type { Ahora } from "../../shared/lib/useAhora"
import { nombreCompleto, useClientes } from "../../features/customers/api/clientes.api"
import type { Cliente } from "../../features/customers/api/clientes.api"
import { formatDuracion, useHorariosLibres, useServicios } from "../../data/servicios"
import { crearTurno, editarTurno, estaAbierto } from "../../data/turnos"
import type { Turno } from "../../data/turnos"

const opcionClass =
  "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-cream-dark bg-surface px-4 py-3 text-left text-base text-ink transition hover:border-rose-dark hover:bg-rose/10"
const campo = `${inputClass} py-3 text-base`
const linkClass = "text-base text-rose-dark underline underline-offset-4 hover:text-ink"

type ClienteElegido = Pick<Cliente, "id" | "nombre" | "apellido" | "telefono">
type ServicioElegido = { id: number; name: string; durationMin: number; price: number }

/**
 * Cómo se elige la hora:
 *   libres  los horarios libres del día, los mismos que vería una clienta.
 *   fuera   una hora a mano, fuera del horario de atención (igual no pisa otro turno).
 *   pasado  una hora a mano que ya pasó: alguien que vino sin turno, o corregir
 *           uno ya completado. Se guarda como completado.
 */
type ModoHora = "libres" | "fuera" | "pasado"

/**
 * Dar, cambiar o cargar un turno desde el panel.
 *
 * Tres preguntas, una debajo de la otra, y cada una aparece recién cuando la
 * anterior está respondida: ¿para quién?, ¿qué servicio?, ¿qué día y a qué
 * hora? Lo ya elegido queda como un renglón con "Cambiar", así la dueña ve
 * siempre lo que va a guardar.
 *
 * Con `turno`, edita ese turno: la clienta queda fija y lo demás arranca con lo
 * que tiene. Qué se puede cambiar depende del estado (las reglas están en el
 * backend, PATCH /api/admin/turnos/:id):
 *   - pedido (reservado/confirmado): se mueve de ahora en adelante.
 *   - completado / no vino: se corrige, pero sigue en el pasado.
 *   - cancelado: solo la nota.
 */
export default function FormularioTurno({
  turno,
  fechaInicial,
  horaInicial,
  ahora,
  onGuardado,
  onCerrar,
}: {
  /** El turno a cambiar. Sin turno, da uno nuevo. */
  turno?: Turno
  fechaInicial: string
  /** Cuando se abre tocando un hueco del calendario. */
  horaInicial?: string
  ahora: Ahora
  onGuardado: (turno: Turno) => void
  onCerrar: () => void
}) {
  const editando = Boolean(turno)
  const soloNota = turno?.estado === "cancelado"
  const esHistoria = turno ? !estaAbierto(turno) && !soloNota : false

  const [cliente, setCliente] = useState<ClienteElegido | null>(turno?.cliente ?? null)
  const [servicio, setServicio] = useState<ServicioElegido | null>(
    turno
      ? {
          id: turno.servicio.id,
          name: turno.servicio.nombre,
          durationMin: aMinutos(turno.horaFin) - aMinutos(turno.horaInicio),
          price: turno.precio,
        }
      : null,
  )
  const [fecha, setFecha] = useState(turno?.fecha ?? fechaInicial)
  const [hora, setHora] = useState<string | null>(turno?.horaInicio ?? horaInicial ?? null)
  const [modoElegido, setModoElegido] = useState<ModoHora>(esHistoria ? "pasado" : "libres")
  const [horaManual, setHoraManual] = useState(turno?.horaInicio ?? horaInicial ?? "")
  const [notas, setNotas] = useState(turno?.notas ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Un día que ya pasó solo admite cargar lo que pasó. Uno futuro, nunca.
  const modo: ModoHora =
    fecha < ahora.fecha ? "pasado" : fecha > ahora.fecha && modoElegido === "pasado" ? "libres" : modoElegido
  const pasadoHoraFutura = modo === "pasado" && fecha === ahora.fecha && horaManual > ahora.hora

  const libres = useHorariosLibres(modo === "libres" && servicio ? servicio.id : null, fecha, turno?.id)
  const disponibles = (libres.datos ?? []).filter((h) => h.available).map((h) => h.time)

  // La hora que viene de tocar el calendario puede no servir para el servicio
  // elegido (no entra antes del cierre, o se pisa con otro turno): en ese caso
  // simplemente no queda elegida, sin un efecto que la borre.
  const horaElegida =
    modo === "libres" ? (hora && disponibles.includes(hora) ? hora : null) : pasadoHoraFutura ? null : horaManual || null

  const listo = soloNota || Boolean(cliente && servicio && horaElegida)

  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => e.key === "Escape" && !guardando && onCerrar()
    document.addEventListener("keydown", alApretar)
    return () => document.removeEventListener("keydown", alApretar)
  }, [onCerrar, guardando])

  async function guardar() {
    if (!listo) return
    setGuardando(true)
    setError(null)
    try {
      const nota = notas.trim()
      let guardado: Turno
      if (turno && soloNota) {
        guardado = await editarTurno(turno.id, { notas: nota || null })
      } else if (turno) {
        guardado = await editarTurno(turno.id, {
          fecha,
          hora: horaElegida!,
          servicioId: servicio!.id,
          notas: nota || null,
          fueraDeHorario: modo === "fuera",
        })
      } else {
        guardado = await crearTurno({
          clienteId: cliente!.id,
          servicioId: servicio!.id,
          fecha,
          hora: horaElegida!,
          notas: nota || undefined,
          fueraDeHorario: modo === "fuera",
        })
      }
      onGuardado(guardado)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el turno.")
      // Si alguien tomó el horario mientras tanto, se actualiza la lista.
      if (err instanceof ApiError && err.status === 409) libres.recargar()
      setGuardando(false)
    }
  }

  const titulo = !turno ? "Nuevo turno" : soloNota ? "Nota del turno" : esHistoria ? "Corregir turno" : "Cambiar turno"
  const textoBoton = editando ? "Guardar cambios" : modo === "pasado" ? "Cargar turno" : "Agendar turno"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={() => !guardando && onCerrar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-turno-titulo"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="form-turno-titulo" className="font-display text-2xl font-semibold text-ink">
              {titulo}
            </h2>
            {turno && (
              <p className="mt-1 text-base text-ink-soft first-letter:uppercase">
                Hoy está: {formatLongDate(turno.fecha)} a las {turno.horaInicio} · {turno.servicio.nombre}
              </p>
            )}
          </div>
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
          {soloNota && (
            <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink">
              Este turno está cancelado: solo se puede cambiar la nota. Si la clienta vuelve, dale un turno nuevo.
            </p>
          )}

          {/* 1. Clienta (fija al editar) */}
          {!soloNota && (
            <Paso numero={1} titulo="¿Para quién es?">
              {cliente ? (
                <Elegido onCambiar={editando ? undefined : () => setCliente(null)}>
                  <span className="font-semibold">{nombreCompleto(cliente)}</span>
                  <span className="text-ink-soft"> · {formatTelefono(cliente.telefono)}</span>
                </Elegido>
              ) : (
                <ElegirCliente onElegir={setCliente} />
              )}
            </Paso>
          )}

          {/* 2. Servicio */}
          {!soloNota && cliente && (
            <Paso numero={2} titulo="¿Qué servicio?">
              {servicio ? (
                <Elegido onCambiar={() => setServicio(null)}>
                  <span className="font-semibold">{servicio.name}</span>
                  <span className="text-ink-soft"> · {formatDuracion(servicio.durationMin)} · {formatPrice(servicio.price)}</span>
                </Elegido>
              ) : (
                <>
                  {editando && (
                    <p className="mb-3 text-sm text-ink-soft">Si cambiás el servicio, el turno toma el precio y la duración actuales del nuevo.</p>
                  )}
                  <ElegirServicio
                    onElegir={(s) => setServicio({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price })}
                  />
                </>
              )}
            </Paso>
          )}

          {/* 3. Día y hora */}
          {!soloNota && cliente && servicio && (
            <Paso numero={3} titulo="¿Qué día y a qué hora?">
              <label htmlFor="ft-fecha" className={`${labelClass} text-base`}>Día</label>
              <input
                id="ft-fecha"
                type="date"
                // Un turno pedido se mueve para adelante; uno completado se corrige para atrás.
                min={esHistoria ? undefined : editando ? ahora.fecha : undefined}
                max={esHistoria ? ahora.fecha : undefined}
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
                className={`${campo} max-w-xs`}
              />
              <p className="mt-1.5 text-base text-ink-soft first-letter:uppercase">{formatLongDate(fecha)}</p>

              {modo === "libres" && (
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
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModoElegido("fuera")
                        setHoraManual(horaElegida ?? horaManual)
                      }}
                      className={linkClass}
                    >
                      Darlo en otro horario
                    </button>
                    {!editando && fecha === ahora.fecha && (
                      <button type="button" onClick={() => setModoElegido("pasado")} className={linkClass}>
                        Ya vino (cargar un turno que ya pasó)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {modo === "fuera" && (
                <div className="mt-5 rounded-xl border border-[#e0b44a] bg-[#fdf3dc] p-4">
                  <label htmlFor="ft-hora" className={`${labelClass} text-base`}>Hora (fuera del horario de atención)</label>
                  <input
                    id="ft-hora"
                    type="time"
                    step={900}
                    value={horaManual}
                    onChange={(e) => setHoraManual(e.target.value)}
                    className={`${campo} max-w-[10rem]`}
                  />
                  <p className="mt-2 text-sm text-ink-soft">Igual no deja pisar otro turno. Dura {formatDuracion(servicio.durationMin)}.</p>
                  <button type="button" onClick={() => setModoElegido("libres")} className={`mt-3 ${linkClass}`}>
                    Volver a los horarios libres
                  </button>
                </div>
              )}

              {modo === "pasado" && (
                <div className="mt-5 rounded-xl border border-[#1f8a4c]/40 bg-[#dcf2e3] p-4">
                  <label htmlFor="ft-hora-pasada" className={`${labelClass} text-base`}>¿A qué hora vino?</label>
                  <input
                    id="ft-hora-pasada"
                    type="time"
                    step={300}
                    value={horaManual}
                    onChange={(e) => setHoraManual(e.target.value)}
                    className={`${campo} max-w-[10rem]`}
                  />
                  {pasadoHoraFutura ? (
                    <p className="mt-2 text-sm font-medium text-[#a12b28]">Esa hora todavía no llegó.</p>
                  ) : (
                    <p className="mt-2 text-sm text-[#14532d]">
                      {editando ? "Sigue figurando como lo marcaste." : "Se guarda como ✅ completado y suma en Finanzas."}
                    </p>
                  )}
                  {!esHistoria && fecha === ahora.fecha && (
                    <button type="button" onClick={() => setModoElegido("libres")} className={`mt-3 ${linkClass}`}>
                      Volver a los horarios libres
                    </button>
                  )}
                </div>
              )}
            </Paso>
          )}

          {(soloNota || (cliente && servicio)) && (
            <div>
              <label htmlFor="ft-notas" className={`${labelClass} text-base`}>
                Nota <span className="font-normal text-ink-soft">(opcional, solo la ves vos)</span>
              </label>
              <textarea
                id="ft-notas"
                rows={2}
                maxLength={1000}
                placeholder="Ej: viene con la hija, prefiere aceite sin perfume…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={`${campo} resize-none`}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
              {error}
            </p>
          )}

          {!soloNota && cliente && servicio && horaElegida && (
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
              disabled={!listo || guardando}
              className={`${primaryButtonClass} min-h-12 px-6 text-base`}
            >
              {guardando ? "Guardando…" : textoBoton}
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

/** Lo ya elegido. Sin `onCambiar` queda fijo (la clienta de un turno que se está cambiando). */
function Elegido({ children, onCambiar }: { children: ReactNode; onCambiar?: () => void }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-ink/15 bg-surface px-4 py-3">
      <p className="text-base">{children}</p>
      {onCambiar && (
        <button type="button" onClick={onCambiar} className={`min-h-12 shrink-0 px-2 ${linkClass}`}>
          Cambiar
        </button>
      )}
    </div>
  )
}

/** Busca entre las clientas, o da de alta una nueva sin salir del turno. */
function ElegirCliente({ onElegir }: { onElegir: (cliente: ClienteElegido) => void }) {
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
      <label htmlFor="ft-buscar" className="sr-only">Buscar clienta</label>
      <input
        id="ft-buscar"
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
function ElegirServicio({ onElegir }: { onElegir: (servicio: ServicioElegido) => void }) {
  const servicios = useServicios()

  const lista = servicios.datos
  if (servicios.error) return <ErrorCarga mensaje={servicios.error} onReintentar={servicios.recargar} alto="h-24" />
  if (!lista) return <Cargando alto="h-24" />
  if (!lista.length) {
    return <p className="text-base text-ink-soft">Todavía no hay servicios cargados.</p>
  }

  return (
    <div className="space-y-4">
      {categoriesOf(lista).map((categoria) => (
        <div key={categoria}>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-soft">{categoria}</p>
          <div className="space-y-2">
            {lista
              .filter((s) => s.category === categoria)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => onElegir(s)} className={opcionClass}>
                  <span className="font-semibold">{s.name}</span>
                  <span className="shrink-0 text-ink-soft">
                    {formatDuracion(s.durationMin)} · {formatPrice(s.price)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
