import { useState } from "react"
import type { FormEvent } from "react"
import Panel from "../Panel"
import { ApiError } from "../../lib/api"
import { inputClass, labelClass, primaryButtonClass } from "../../lib/styles"
import { cambiarContrasena } from "../../data/cuenta"

const campo = `${inputClass} py-3 text-base`

/** Cambiar la contraseña del panel: la actual, la nueva dos veces (para no equivocarse al tipear). */
export default function CambiarContrasena() {
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  const [ver, setVer] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setListo(false)
    if (nueva.length < 8) return setError("La contraseña nueva tiene que tener al menos 8 caracteres.")
    if (nueva !== repetida) return setError("Las dos contraseñas nuevas no coinciden.")
    setGuardando(true)
    try {
      await cambiarContrasena(actual, nueva)
      setActual("")
      setNueva("")
      setRepetida("")
      setListo(true)
    } catch (err) {
      const detalle = err instanceof ApiError ? (err.detalle as { mensaje: string }[] | undefined) : undefined
      setError(detalle?.[0]?.mensaje ?? (err instanceof Error ? err.message : "No se pudo cambiar la contraseña."))
    } finally {
      setGuardando(false)
    }
  }

  const tipo = ver ? "text" : "password"

  return (
    <Panel title="Cambiar contraseña" description="Al menos 8 caracteres. Una frase corta es más fácil de recordar y más segura, por ejemplo “turnos de la mañana”.">
      <form onSubmit={guardar} className="space-y-4 sm:max-w-md">
        <div>
          <label htmlFor="cc-actual" className={`${labelClass} text-base`}>Contraseña actual</label>
          <input id="cc-actual" type={tipo} required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cc-nueva" className={`${labelClass} text-base`}>Contraseña nueva</label>
          <input id="cc-nueva" type={tipo} required autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cc-repetida" className={`${labelClass} text-base`}>Repetí la contraseña nueva</label>
          <input id="cc-repetida" type={tipo} required autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={campo} />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-base text-ink">
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="h-5 w-5" />
          Mostrar las contraseñas
        </label>
        {error && (
          <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
            {error}
          </p>
        )}
        {listo && <p className="rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">✅ Listo, la próxima vez entrá con la contraseña nueva.</p>}
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </Panel>
  )
}
