import { useRef, useState } from "react"
import type { FormEvent } from "react"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { ApiError } from "../lib/api"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import RecordatoriosTabs from "../components/RecordatoriosTabs"
import { actualizarTipo, borrarTipo, crearTipo, formatAnticipacion, useTiposRecordatorio } from "../data/recordatorios"
import type { TipoRecordatorio } from "../data/recordatorios"

const campo = `${inputClass} py-3 text-base`

/** Opciones de "¿Cuándo?": de 1 hora a 1 semana antes del turno. */
const anticipaciones = [1, 2, 3, 6, 12, 24, 48, 72, 168]

const variables = [
  { clave: "{nombre}", label: "Nombre de la clienta", ejemplo: "Sofía" },
  { clave: "{servicio}", label: "Servicio", ejemplo: "Limpieza facial" },
  { clave: "{fecha}", label: "Día", ejemplo: "martes 20 de octubre" },
  { clave: "{hora}", label: "Hora", ejemplo: "14:30" },
  { clave: "{negocio}", label: "Nombre del local", ejemplo: "Dp.belleza" },
]

const ejemplo = (plantilla: string) => variables.reduce((texto, v) => texto.replaceAll(v.clave, v.ejemplo), plantilla)

/**
 * Recordatorios → Mensajes (/recordatorios/mensajes).
 *
 * Cada tipo es una regla: "a las clientas con turno dentro de X horas,
 * mandales este mensaje". La pestaña Para mandar muestra a quién le toca.
 */
export default function AdminReminderTypes() {
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
        description="Qué mensaje mandar y cuánto antes del turno. Podés tener varios, por ejemplo una confirmación 2 días antes y un recordatorio el día anterior."
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

          <p className="text-sm text-ink-soft">
            Si a un turno le tocan dos a la vez (por ejemplo, alguien que reservó para mañana), en Para mandar aparece solo el más cercano al turno, así no le llegan dos mensajes.
          </p>
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
          <p className="mt-0.5 inline-block rounded-full bg-rose/30 px-3 py-0.5 text-base font-medium text-ink">
            {formatAnticipacion(tipo.horasAntes)} del turno
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
  const [nombre, setNombre] = useState(tipo?.nombre ?? "")
  const [horas, setHoras] = useState(tipo?.horasAntes ?? 24)
  const [mensaje, setMensaje] = useState(
    tipo?.mensaje ?? "Hola {nombre}! Te escribimos de {negocio} por tu turno de {servicio} el {fecha} a las {hora}.",
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mensajeRef = useRef<HTMLTextAreaElement>(null)

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
    try {
      const datos = { nombre: nombre.trim(), horasAntes: horas, mensaje: mensaje.trim() }
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

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tr-nombre" className={`${labelClass} text-base`}>Nombre</label>
          <input id="tr-nombre" required maxLength={100} placeholder="Ej: Confirmación del turno" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
          <p className="mt-1.5 text-sm text-ink-soft">Solo lo ves vos, para saber cuál es cuál.</p>
        </div>
        <div>
          <label htmlFor="tr-horas" className={`${labelClass} text-base`}>¿Cuándo se manda?</label>
          <select id="tr-horas" value={horas} onChange={(e) => setHoras(Number(e.target.value))} className={campo}>
            {(anticipaciones.includes(horas) ? anticipaciones : [...anticipaciones, horas].sort((a, b) => a - b)).map((h) => (
              <option key={h} value={h}>
                {h === 168 ? "1 semana antes" : formatAnticipacion(h)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tr-mensaje" className={`${labelClass} text-base`}>Mensaje</label>
        <textarea id="tr-mensaje" ref={mensajeRef} required rows={4} maxLength={1000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={`${campo} resize-y`} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-soft">Agregar:</span>
          {variables.map((v) => (
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
