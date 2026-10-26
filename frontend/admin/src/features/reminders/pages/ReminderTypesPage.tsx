import { useRef, useState } from "react"
import type { FormEvent } from "react"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import RecordatoriosTabs from "../components/RecordatoriosTabs"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { useServiciosAdmin } from "../../catalog/api/catalogo.api"
import { actualizarTipo, borrarTipo, crearTipo, describirCuando, formatAnticipacion, useTiposRecordatorio } from "../api/recordatorios.api"
import type { DatosTipo, Momento, TipoRecordatorio } from "../api/recordatorios.api"

const campo = `${inputClass} py-3 text-base`

const momentos: { valor: Momento; titulo: string; ayuda: string }[] = [
  { valor: "antes", titulo: "⏰ Antes del turno", ayuda: "Para confirmar o recordar un turno que viene." },
  { valor: "despues", titulo: "🔁 Después de la visita", ayuda: "Para invitarla a volver, por ejemplo a renovar un tratamiento." },
  { valor: "cumpleanos", titulo: "🎂 Cumpleaños", ayuda: "Para saludarla o mandarle una promo." },
]

/** Antes del turno: de 1 hora a 1 semana. */
const horasAntes = [1, 2, 3, 6, 12, 24, 48, 72, 168]
/** Después de la visita: de una semana a un año. */
const diasDespues = [7, 14, 21, 28, 30, 45, 60, 90, 180, 365]
/** Cumpleaños: el mismo día o hasta un mes antes. */
const diasCumple = [0, 1, 2, 3, 7, 14, 30]

const etiquetaDias = (n: number) =>
  n === 0 ? "El mismo día" : n === 1 ? "1 día" : n % 7 === 0 && n <= 28 ? (n === 7 ? "1 semana" : `${n / 7} semanas`) : `${n} días`

/** Qué se puede poner en cada mensaje. En un cumpleaños no hay turno: ni servicio ni hora. */
const variables = [
  { clave: "{nombre}", label: "Nombre de la clienta", ejemplo: "Sofía", momentos: ["antes", "despues", "cumpleanos"] },
  { clave: "{servicio}", label: "Servicio", ejemplo: "Limpieza facial", momentos: ["antes", "despues"] },
  { clave: "{fecha}", label: "Día", ejemplo: "martes 20 de octubre", momentos: ["antes", "despues", "cumpleanos"] },
  { clave: "{hora}", label: "Hora", ejemplo: "14:30", momentos: ["antes", "despues"] },
  { clave: "{negocio}", label: "Nombre del local", ejemplo: "Dp.belleza", momentos: ["antes", "despues", "cumpleanos"] },
]

const ejemplo = (plantilla: string) => variables.reduce((texto, v) => texto.replaceAll(v.clave, v.ejemplo), plantilla)

const textoInicial: Record<Momento, string> = {
  antes: "Hola {nombre}! Te escribimos de {negocio} por tu turno de {servicio} el {fecha} a las {hora}.",
  despues: "Hola {nombre}! ¿Cómo te fue con {servicio}? Si querés, te reservamos el próximo turno.",
  cumpleanos: "¡Feliz cumpleaños {nombre}! 🎂 De regalo tenés un 15% en tu próximo turno en {negocio}.",
}

/**
 * Recordatorios → Mensajes (/recordatorios/mensajes).
 *
 * Cada tipo es una regla: "a las clientas que cumplen tal cosa, mandales este
 * mensaje". La pestaña Para mandar muestra a quién le toca hoy.
 */
export default function ReminderTypesPage() {
  const tipos = useTiposRecordatorio()
  /** Qué se está editando: un tipo por id, "nuevo", o nada. */
  const [editando, setEditando] = useState<number | "nuevo" | null>(null)

  const alGuardar = () => {
    setEditando(null)
    tipos.recargar()
  }

  return (
    <div>
      <PageHeader
        title="Recordatorios"
        description="Qué mensaje mandar y cuándo: antes de un turno, unos días después de la visita o por el cumpleaños."
        withPeriod={false}
        action={<RecordatoriosTabs />}
      />

      {tipos.error ? (
        <Panel>
          <ErrorCarga mensaje={tipos.error} onReintentar={tipos.recargar} />
        </Panel>
      ) : !tipos.datos ? (
        <Panel>
          <Cargando />
        </Panel>
      ) : (
        <div className="space-y-6">
          {tipos.datos.map((t) =>
            editando === t.id ? (
              <Panel key={t.id} title="Editar mensaje">
                <FormularioTipo tipo={t} onGuardado={alGuardar} onCancelar={() => setEditando(null)} />
              </Panel>
            ) : (
              <TarjetaTipo key={t.id} tipo={t} onEditar={() => setEditando(t.id)} onBorrado={tipos.recargar} />
            ),
          )}

          {tipos.datos.length === 0 && editando !== "nuevo" && (
            <Panel>
              <p className="py-6 text-center text-base text-ink-soft">No tenés ningún recordatorio. Agregá el primero.</p>
            </Panel>
          )}

          {editando === "nuevo" ? (
            <Panel title="Nuevo recordatorio">
              <FormularioTipo onGuardado={alGuardar} onCancelar={() => setEditando(null)} />
            </Panel>
          ) : (
            <button type="button" onClick={() => setEditando("nuevo")} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
              + Agregar otro recordatorio
            </button>
          )}

          <ul className="space-y-1 text-sm text-ink-soft">
            <li>· Si a un turno le tocan dos a la vez (por ejemplo, alguien que reservó para mañana), aparece solo el más cercano, así no le llegan dos mensajes.</li>
            <li>· Los de después de la visita no aparecen si la clienta ya tiene otro turno pedido.</li>
            <li>· Los de cumpleaños aparecen solo para las clientas que tienen el cumpleaños cargado en su ficha.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function TarjetaTipo({ tipo, onEditar, onBorrado }: { tipo: TipoRecordatorio; onEditar: () => void; onBorrado: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function borrar() {
    try {
      await borrarTipo(tipo.id)
      onBorrado()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo borrar.")
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-ink">{tipo.nombre}</p>
          <p className="mt-1 inline-block rounded-full bg-rose/30 px-3 py-0.5 text-base font-medium text-ink">
            {momentos.find((m) => m.valor === tipo.momento)?.titulo.split(" ")[0]} {describirCuando(tipo)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEditar} className={`${primaryButtonClass} min-h-12 px-5 text-base`}>
            Editar
          </button>
          <button type="button" onClick={() => setConfirmando(true)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
            Borrar
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#dcf2e3] p-4">
        <p className="text-sm font-medium text-[#14532d]">Así le llega a la clienta:</p>
        <p className="mt-1 whitespace-pre-line text-base text-ink">{ejemplo(tipo.mensaje)}</p>
      </div>

      {confirmando && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#e9b9b6] bg-[#fbe4e2] p-4">
          <p className="w-full text-base text-ink sm:w-auto">¿Borrar “{tipo.nombre}”? Deja de aparecer en Para mandar.</p>
          <button type="button" onClick={() => void borrar()} className="min-h-12 rounded-xl bg-[#c0392b] px-5 text-base font-semibold text-white hover:bg-[#a12b28]">
            Sí, borrar
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
            No
          </button>
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
    </Panel>
  )
}

function FormularioTipo({ tipo, onGuardado, onCancelar }: { tipo?: TipoRecordatorio; onGuardado: () => void; onCancelar: () => void }) {
  const [momento, setMomento] = useState<Momento>(tipo?.momento ?? "antes")
  const [nombre, setNombre] = useState(tipo?.nombre ?? "")
  const [horas, setHoras] = useState(tipo?.horasAntes ?? 24)
  const [dias, setDias] = useState(tipo?.dias ?? (tipo?.momento === "cumpleanos" ? 0 : 21))
  const [servicioId, setServicioId] = useState<number | null>(tipo?.servicio?.id ?? null)
  const [mensaje, setMensaje] = useState(tipo?.mensaje ?? textoInicial.antes)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mensajeRef = useRef<HTMLTextAreaElement>(null)
  const servicios = useServiciosAdmin()

  /** Al cambiar de momento en uno nuevo, el texto de ejemplo y los días acompañan (si no lo tocó). */
  function elegirMomento(m: Momento) {
    if (!tipo && Object.values(textoInicial).includes(mensaje)) setMensaje(textoInicial[m])
    if (m === "cumpleanos" && !diasCumple.includes(dias)) setDias(0)
    if (m === "despues" && !diasDespues.includes(dias)) setDias(21)
    setMomento(m)
  }

  /** Inserta la variable donde está el cursor, así no tiene que escribir las llaves. */
  function insertar(clave: string) {
    const el = mensajeRef.current
    const inicio = el?.selectionStart ?? mensaje.length
    const fin = el?.selectionEnd ?? mensaje.length
    setMensaje(mensaje.slice(0, inicio) + clave + mensaje.slice(fin))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(inicio + clave.length, inicio + clave.length)
    })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const base = { nombre: nombre.trim(), mensaje: mensaje.trim() }
    const datos: DatosTipo =
      momento === "antes"
        ? { ...base, momento, horasAntes: horas }
        : momento === "despues"
          ? { ...base, momento, dias, servicioId }
          : { ...base, momento, dias }
    try {
      if (tipo) await actualizarTipo(tipo.id, datos)
      else await crearTipo(datos)
      onGuardado()
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Revisá que tenga un nombre y que el mensaje tenga al menos 10 letras."
          : err instanceof Error
            ? err.message
            : "No se pudo guardar.",
      )
      setGuardando(false)
    }
  }

  const opcionesDias = momento === "despues" ? diasDespues : diasCumple
  const visibles = variables.filter((v) => v.momentos.includes(momento))

  return (
    <form onSubmit={guardar} className="space-y-5">
      <fieldset>
        <legend className={`${labelClass} text-base`}>¿Cuándo se manda?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {momentos.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => elegirMomento(m.valor)}
              aria-pressed={momento === m.valor}
              className={`rounded-xl border p-3 text-left transition ${
                momento === m.valor ? "border-ink bg-ink text-cream" : "border-cream-dark bg-surface text-ink hover:border-rose-dark"
              }`}
            >
              <span className="block text-base font-semibold">{m.titulo}</span>
              <span className={`mt-0.5 block text-sm ${momento === m.valor ? "text-cream/80" : "text-ink-soft"}`}>{m.ayuda}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tr-nombre" className={`${labelClass} text-base`}>Nombre</label>
          <input id="tr-nombre" required maxLength={100} placeholder="Ej: Renovar depilación" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
          <p className="mt-1.5 text-sm text-ink-soft">Solo lo ves vos, para saber cuál es cuál.</p>
        </div>

        {momento === "antes" ? (
          <div>
            <label htmlFor="tr-horas" className={`${labelClass} text-base`}>¿Cuánto antes del turno?</label>
            <select id="tr-horas" value={horas} onChange={(e) => setHoras(Number(e.target.value))} className={campo}>
              {(horasAntes.includes(horas) ? horasAntes : [...horasAntes, horas].sort((a, b) => a - b)).map((h) => (
                <option key={h} value={h}>
                  {formatAnticipacion(h)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="tr-dias" className={`${labelClass} text-base`}>
              {momento === "despues" ? "¿Cuánto después de la visita?" : "¿Cuánto antes del cumpleaños?"}
            </label>
            <select id="tr-dias" value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo}>
              {(opcionesDias.includes(dias) ? opcionesDias : [...opcionesDias, dias].sort((a, b) => a - b)).map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "El mismo día" : `${etiquetaDias(d)} ${momento === "despues" ? "después" : "antes"}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {momento === "despues" && (
          <div className="sm:col-span-2">
            <label htmlFor="tr-servicio" className={`${labelClass} text-base`}>¿Para qué servicio?</label>
            <select
              id="tr-servicio"
              value={servicioId ?? ""}
              onChange={(e) => setServicioId(e.target.value ? Number(e.target.value) : null)}
              className={`${campo} sm:max-w-md`}
            >
              <option value="">Cualquier servicio</option>
              {(servicios.datos ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-sm text-ink-soft">Por ejemplo, depilación láser cada 21 días. Se cuenta desde la última visita de ese servicio.</p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="tr-mensaje" className={`${labelClass} text-base`}>Mensaje</label>
        <textarea id="tr-mensaje" ref={mensajeRef} required rows={4} maxLength={1000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={`${campo} resize-y`} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-soft">Agregar:</span>
          {visibles.map((v) => (
            <button
              key={v.clave}
              type="button"
              onClick={() => insertar(v.clave)}
              className="min-h-11 rounded-full border border-cream-dark bg-surface px-4 text-base text-ink transition hover:border-rose-dark"
            >
              + {v.label}
            </button>
          ))}
        </div>
        {momento === "cumpleanos" && <p className="mt-1.5 text-sm text-ink-soft">En un cumpleaños, el día es el del cumpleaños.</p>}
        <div className="mt-4 rounded-xl bg-[#dcf2e3] p-4">
          <p className="text-sm font-medium text-[#14532d]">Así le llega a la clienta:</p>
          <p className="mt-1 whitespace-pre-line text-base text-ink">{ejemplo(mensaje) || "—"}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : tipo ? "Guardar cambios" : "Agregar recordatorio"}
        </button>
        <button type="button" onClick={onCancelar} disabled={guardando} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
