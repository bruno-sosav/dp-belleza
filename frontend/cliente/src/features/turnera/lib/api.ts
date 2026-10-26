/**
 * Cliente HTTP de la turnera.
 *
 * Las rutas públicas (/api/turnos/*) no llevan login. El backend contesta los
 * errores siempre como { error, detalle? }, así que se traducen una sola vez a
 * `ApiError` y las pantallas solo leen `status` y `message`.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type Options = {
  method?: "GET" | "POST"
  body?: unknown
  query?: Record<string, string | number>
}

export async function api<T>(path: string, { method = "GET", body, query }: Options = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value))

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.")
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, (data?.error as string) ?? "Ocurrió un error. Probá de nuevo.")
  }
  return data as T
}
