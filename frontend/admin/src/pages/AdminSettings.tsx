import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import AjustesTabs from "../components/AjustesTabs"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { ApiError } from "../lib/api"
import { formatTelefono } from "../lib/format"
import { inputClass, labelClass, primaryButtonClass } from "../lib/styles"
import { guardarConfiguracion, useConfiguracion } from "../data/configuracion"
import type { CambiosConfiguracion, Configuracion } from "../data/configuracion"

const campo = `${inputClass} py-3 text-base`

/**
 * Ajustes → Tu negocio (/ajustes): los datos del local que muestra la web
 * (Contacto, pie de página, botón de WhatsApp). Antes estaban escritos en el
 * código. Mercado Pago es la otra pestaña de Ajustes; cada cuánto se ofrecen
 * turnos está en Turnos → Horario.
 */
export default function AdminSettings() {
  const config = useConfiguracion()

  return (
    <div>
      <PageHeader title="Ajustes" description="Tus datos de contacto: así aparecen en la web." withPeriod={false} action={<AjustesTabs />} />
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

    </div>
  )
}

function Formulario({ config }: { config: Configuracion }) {
  const [nombre, setNombre] = useState(config.nombre_negocio)
  const [telefono, setTelefono] = useState(config.telefono_negocio ? formatTelefono(config.telefono_negocio) : "")
  const [codigoArea, setCodigoArea] = useState(config.codigo_area_negocio ?? "223")
  const [direccion, setDireccion] = useState(config.direccion_negocio ?? "")
  const [email, setEmail] = useState(config.email_negocio ?? "")
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
      codigo_area_negocio: codigoArea.trim(),
      direccion_negocio: direccion.trim(),
      email_negocio: email.trim(),
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
      <Panel description="Así aparece en la web: en Contacto, en el pie de página y en el botón de WhatsApp.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo label="Nombre del local" htmlFor="aj-nombre">
            <input id="aj-nombre" required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
          </Campo>
          <Campo label="WhatsApp del local" htmlFor="aj-telefono" ayuda="Las clientas te escriben a este número desde la web.">
            <input id="aj-telefono" type="tel" inputMode="tel" placeholder="Ej: 223 555-1234" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} />
          </Campo>
          <Campo
            label="Código de área de tu ciudad"
            htmlFor="aj-area"
            ayuda="Si una clienta pone su teléfono sin código de área (por ejemplo 15 555-1234), se completa con este."
          >
            <input id="aj-area" required inputMode="numeric" maxLength={5} placeholder="223" value={codigoArea} onChange={(e) => setCodigoArea(e.target.value)} className={`${campo} w-32`} />
          </Campo>
          <Campo label="Dirección" htmlFor="aj-direccion">
            <input id="aj-direccion" maxLength={200} placeholder="Ej: Av. Colón 1234, Mar del Plata" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
          </Campo>
          <Campo label="Email" htmlFor="aj-email">
            <input id="aj-email" type="email" maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </Campo>
        </div>
      </Panel>

      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
      {guardado && (
        <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
          ✅ Se guardaron tus datos.
        </p>
      )}

      <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-8 text-base`}>
        {guardando ? "Guardando…" : "Guardar"}
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
      codigo_area_negocio: "el código de área (2 a 4 números, sin el 0)",
      direccion_negocio: "la dirección",
    }
    return `Revisá ${campos[detalle[0].campo] ?? "los datos"}.`
  }
  return err.message
}
