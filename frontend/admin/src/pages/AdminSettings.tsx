import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import PanelMercadoPago from "../components/PanelMercadoPago"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { ApiError } from "../lib/api"
import { formatTelefono } from "../lib/format"
import { inputClass, labelClass, primaryButtonClass } from "../lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../data/configuracion"
import type { CambiosConfiguracion, Configuracion } from "../data/configuracion"

const campo = `${inputClass} py-3 text-base`

const intervalos = [10, 15, 20, 30, 60]

/**
 * Ajustes (/ajustes): datos del local que muestra la web y cada cuánto se
 * ofrecen turnos. Todo lo que antes había que cambiar en el código. Los
 * mensajes de recordatorio tienen su propia sección (Recordatorios → Mensajes).
 */
export default function AdminSettings() {
  const config = useConfiguracion()

  return (
    <div>
      <PageHeader title="Ajustes" description="Tus datos de contacto, cómo se dan los turnos en la web y Mercado Pago. Los mensajes de recordatorio están en Recordatorios." withPeriod={false} />
      {config.error ? (
        <Panel>
          <ErrorCarga mensaje={config.error} onReintentar={config.recargar} />
        </Panel>
      ) : !config.datos ? (
        <Panel>
          <Cargando />
        </Panel>
      ) : (
        <Formulario config={config.datos} />
      )}

      <div className="mt-6">
        <PanelMercadoPago />
      </div>
    </div>
  )
}

function Formulario({ config }: { config: Configuracion }) {
  const [nombre, setNombre] = useState(config.nombre_negocio)
  const [telefono, setTelefono] = useState(config.telefono_negocio ? formatTelefono(config.telefono_negocio) : "")
  const [direccion, setDireccion] = useState(config.direccion_negocio ?? "")
  const [email, setEmail] = useState(config.email_negocio ?? "")
  const [intervalo, setIntervalo] = useState(Number(config.intervalo_turnos_min) || 15)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setGuardado(false)
    const cambios: CambiosConfiguracion = {
      nombre_negocio: nombre.trim(),
      telefono_negocio: telefono.trim(),
      direccion_negocio: direccion.trim(),
      email_negocio: email.trim(),
      intervalo_turnos_min: intervalo,
    }
    try {
      const nueva = await guardarConfiguracion(cambios)
      setTelefono(nueva.telefono_negocio ? formatTelefono(nueva.telefono_negocio) : "")
      setGuardado(true)
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : "No se pudieron guardar los ajustes.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} onChange={() => setGuardado(false)} className="space-y-6">
      <Panel title="Tu negocio" description="Así aparece en la web: en Contacto, en el pie de página y en el botón de WhatsApp.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo label="Nombre del local" htmlFor="aj-nombre">
            <input id="aj-nombre" required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
          </Campo>
          <Campo label="WhatsApp del local" htmlFor="aj-telefono" ayuda="Las clientas te escriben a este número desde la web.">
            <input id="aj-telefono" type="tel" inputMode="tel" placeholder="Ej: 223 555-1234" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} />
          </Campo>
          <Campo label="Dirección" htmlFor="aj-direccion">
            <input id="aj-direccion" maxLength={200} placeholder="Ej: Av. Colón 1234, Mar del Plata" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
          </Campo>
          <Campo label="Email" htmlFor="aj-email">
            <input id="aj-email" type="email" maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </Campo>
        </div>
      </Panel>

      <Panel title="Turnos en la web">
        <Campo label="Ofrecer horarios cada" htmlFor="aj-intervalo" ayuda="Con 15 minutos, la web ofrece 9:00, 9:15, 9:30… Con 30, 9:00, 9:30…">
          <select id="aj-intervalo" value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} className={`${campo} max-w-xs`}>
            {intervalos.map((m) => (
              <option key={m} value={m}>
                {m === 60 ? "1 hora" : `${m} minutos`}
              </option>
            ))}
            {!intervalos.includes(intervalo) && <option value={intervalo}>{intervalo} minutos</option>}
          </select>
        </Campo>
      </Panel>

      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
      {guardado && (
        <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
          ✅ Se guardaron los ajustes.
        </p>
      )}

      <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-8 text-base`}>
        {guardando ? "Guardando…" : "Guardar ajustes"}
      </button>
    </form>
  )
}

function Campo({ label, htmlFor, ayuda, children }: { label: string; htmlFor: string; ayuda?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={`${labelClass} text-base`}>
        {label}
      </label>
      {children}
      {ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>}
    </div>
  )
}

function mensajeDeError(err: ApiError) {
  const detalle = err.detalle as { campo: string; mensaje: string }[] | undefined
  if (Array.isArray(detalle) && detalle[0]) {
    const campos: Record<string, string> = {
      nombre_negocio: "el nombre del local",
      email_negocio: "el email",
      direccion_negocio: "la dirección",
    }
    return `Revisá ${campos[detalle[0].campo] ?? "los datos"}.`
  }
  return err.message
}
