import { useCallback, useEffect, useState } from "react"
import { ApiError } from "./api"

export type Load<T> = {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Pide datos y expone cargando / error / recargar.
 *
 * `request` tiene que ser estable (useCallback o definida fuera del componente):
 * cada vez que cambia se dispara un pedido nuevo. Una respuesta vieja nunca pisa
 * a una nueva, y mientras recarga se mantiene el dato anterior.
 */
export function useApi<T>(request: () => Promise<T>): Load<T> {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    request: () => Promise<T>
    attempt: number
    data: T | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    let alive = true
    request()
      .then((data) => {
        if (alive) setResult({ request, attempt, data, error: null })
      })
      .catch((err) => {
        if (!alive) return
        const error = err instanceof ApiError ? err.message : "Ocurrió un error inesperado."
        setResult({ request, attempt, data: null, error })
      })
    return () => {
      alive = false
    }
  }, [request, attempt])

  const current = result?.request === request && result?.attempt === attempt

  return {
    data: result?.data ?? null,
    loading: !current,
    error: current ? result.error : null,
    reload: useCallback(() => setAttempt((n) => n + 1), []),
  }
}
