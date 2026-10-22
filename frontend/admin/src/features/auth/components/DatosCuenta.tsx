import { useState } from "react"
import type { FormEvent } from "react"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { actualizarSesion } from "../../../shared/lib/sesion"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { guardarCuenta, useCuenta } from "../api/cuenta.api"

const campo = `${inputClass} py-3 text-base`

/** Nombre y email con el que se entra al panel. Cambiar el email pide la contraseña. */
export default function DatosCuenta() {
  const cuenta = useCuenta()
  return (
    <Panel title="Tus datos" description="El email es con el que entrás al panel.">
      {cuenta.error ? (
        <ErrorCarga mensaje={cuenta.error} onReintentar={cuenta.recargar} alto="h-24" />
      ) : !cuenta.datos ? (
        <Cargando alto="h-24" />
      ) : (
        <Formulario inicial={cuenta.datos} />
      )}
    </Panel>
  )
}

function Formulario({ inicial }: { inicial: { nombre: string; email: string } }) {
  const [guardado, setGuardado] = useState(inicial)
  const [nombre, setNombre] = useState(inicial.nombre)
  const [email, setEmail] = useState(inicial.email)
  const [contrasena, setContrasena] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const cambiaEmail = email.trim().toLowerCase() !== guardado.email.toLowerCase()

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setListo(false)
    try {
      const r = await guardarCuenta({ nombre: nombre.trim(), email: email.trim(), ...(cambiaEmail ? { contrasenaActual: contrasena } : {}) })
      actualizarSesion(r.token, r.usuario)
      setGuardado({ nombre: r.usuario.nombre, email: r.email })
      setContrasena("")
      setListo(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cu-nombre" className={`${labelClass} text-base`}>Tu nombre</label>
          <input id="cu-nombre" required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cu-email" className={`${labelClass} text-base`}>Email para entrar</label>
          <input id="cu-email" type="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
        </div>
      </div>
      {cambiaEmail && (
        <div className="sm:max-w-sm">
          <label htmlFor="cu-actual" className={`${labelClass} text-base`}>Tu contraseña actual</label>
          <input id="cu-actual" type="password" required autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className={campo} />
          <p className="mt-1.5 text-sm text-ink-soft">Para cambiar el email te la pedimos, por seguridad.</p>
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
      {listo && <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">✅ Se guardaron tus datos.</p>}
      <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  )
}
