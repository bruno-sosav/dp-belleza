/** Cliente HTTP de la web pública (rutas sin login). Los errores { error, detalle? } pasan a ApiError. */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  status: number
  /** Lo que el backend manda en `detalle` (por ejemplo, qué productos no tienen stock). */
  detalle?: unknown

  constructor(status: number, message: string, detalle?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.detalle = detalle
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
    throw new ApiError(response.status, (data?.error as string) ?? "Ocurrió un error. Probá de nuevo.", data?.detalle)
  }
  return data as T
}
