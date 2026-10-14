import { useState } from "react"
import type { FormEvent } from "react"
import { isAdminConfigured, login } from "../lib/auth"
import { cardClass, inputClass, labelClass, primaryButtonClass } from "../lib/styles"

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setChecking(true)
    const ok = await login(password)
    setChecking(false)
    if (ok) onSuccess()
    else {
      setError("Contraseña incorrecta.")
      setPassword("")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-dark px-4">
      <div className={`${cardClass} w-full max-w-sm p-8`}>
        <p className="font-display text-2xl font-semibold text-ink">Dp.belleza</p>
        <p className="mt-1 text-sm text-ink-soft">Panel de administración</p>

        {isAdminConfigured ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="admin-password" className={labelClass}>
                Contraseña
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                className={inputClass}
              />
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </div>
            <button type="submit" disabled={!password || checking} className={`${primaryButtonClass} w-full`}>
              {checking ? "Verificando…" : "Entrar"}
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-lg bg-cream-dark p-4 text-sm text-ink-soft">
            El panel no tiene contraseña configurada. Definí <code>VITE_ADMIN_PASSWORD_HASH</code> en{" "}
            <code>.env.local</code> y reiniciá el servidor.
          </p>
        )}
      </div>
    </div>
  )
}
