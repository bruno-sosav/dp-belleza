import { useState } from "react"
import type { FormEvent } from "react"
import { iniciarSesion } from "../api/sesion.api"
import type { Usuario } from "../../../shared/lib/sesion"
import { cardClass, inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"

export default function LoginPage({ onSuccess }: { onSuccess: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [entrando, setEntrando] = useState(false)

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setError("")
    try {
      onSuccess(await iniciarSesion(email, password))
    } catch (err) {
      // El servidor manda el mismo mensaje para email inexistente y contraseña
      // incorrecta, para no revelar qué emails están dados de alta.
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.")
      setPassword("")
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-dark px-4">
      <div className={`${cardClass} w-full max-w-sm p-8`}>
        <div className="flex flex-col items-center text-center">
          <img src="/logo/logo-circulo.png" alt="" className="h-16 w-16 rounded-full" />
          <p className="mt-4 font-brand text-2xl text-ink">dppuntobelleza</p>
          <p className="mt-1 text-sm text-ink-soft">Panel de administración</p>
        </div>

        <form onSubmit={manejarEnvio} className="mt-8 space-y-4">
          <div>
            <label htmlFor="admin-email" className={labelClass}>
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="admin-password" className={labelClass}>
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-peligro-claro p-3 text-sm text-peligro">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email || !password || entrando}
            className={`${primaryButtonClass} w-full`}
          >
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
