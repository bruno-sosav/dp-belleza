import { useState, type FormEvent } from "react"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import type { Carga } from "../../../shared/lib/useApi"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { borrarCuentaAndreani, guardarCuentaAndreani, type CuentaAndreani as Cuenta } from "../api/andreani.api"

const vacia = { usuario: "", password: "", cliente: "", contrato: "", entorno: "qa" as const }

/** La cuenta de la API de Andreani: se prueba el login antes de guardarla. La contraseña no vuelve nunca. */
export default function CuentaAndreani({ estado }: { estado: Carga<Cuenta | null> }) {
  return (
    <Panel title="Cuenta de Andreani" description="Usuario y contraseña de la API, número de cliente y contrato: te los da tu ejecutivo de Andreani.">
      {estado.error ? (
        <ErrorCarga mensaje={estado.error} onReintentar={estado.recargar} alto="h-24" />
      ) : estado.cargando && estado.datos === null ? (
        <Cargando alto="h-24" />
      ) : estado.datos ? (
        <Conectada cuenta={estado.datos} onCambio={estado.recargar} />
      ) : (
        <Formulario onGuardada={estado.recargar} />
      )}
    </Panel>
  )
}

function Conectada({ cuenta, onCambio }: { cuenta: Cuenta; onCambio: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const desconectar = async () => {
    try {
      await borrarCuentaAndreani()
      onCambio()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo desconectar.")
    }
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-ink">
        Conectada como <strong>{cuenta.usuario}</strong> · cliente {cuenta.cliente} · contrato {cuenta.contrato} ·{" "}
        {cuenta.entorno === "qa" ? "entorno de pruebas" : "producción"}
      </p>
      {cuenta.verificadaAt && <p className="text-ink-soft">Login probado el {cuenta.verificadaAt}.</p>}
      <button type="button" onClick={() => void desconectar()} className={secondaryButtonClass}>
        Desconectar
      </button>
      {error && <p className="text-peligro">{error}</p>}
    </div>
  )
}

function Formulario({ onGuardada }: { onGuardada: () => void }) {
  const [datos, setDatos] = useState(vacia)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = (k: keyof typeof vacia) => (e: { target: { value: string } }) => setDatos({ ...datos, [k]: e.target.value })

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await guardarCuentaAndreani(datos)
      onGuardada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="an-usuario" className={labelClass}>Usuario de la API</label>
        <input id="an-usuario" required value={datos.usuario} onChange={campo("usuario")} className={inputClass} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="an-pass" className={labelClass}>Contraseña</label>
        <input id="an-pass" required type="password" value={datos.password} onChange={campo("password")} className={inputClass} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="an-cliente" className={labelClass}>Número de cliente</label>
        <input id="an-cliente" required value={datos.cliente} onChange={campo("cliente")} className={inputClass} />
      </div>
      <div>
        <label htmlFor="an-contrato" className={labelClass}>Contrato (envío a domicilio)</label>
        <input id="an-contrato" required value={datos.contrato} onChange={campo("contrato")} className={inputClass} />
      </div>
      <div>
        <label htmlFor="an-entorno" className={labelClass}>Entorno</label>
        <select id="an-entorno" value={datos.entorno} onChange={campo("entorno")} className={inputClass}>
          <option value="qa">Pruebas (QA)</option>
          <option value="produccion">Producción</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={guardando} className={primaryButtonClass}>
          {guardando ? "Probando y guardando…" : "Conectar"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-peligro-claro px-3 py-2 text-sm text-peligro sm:col-span-2" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
