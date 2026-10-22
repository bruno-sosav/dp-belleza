/**
 * Cliente HTTP del panel.
 *
 * Todas las rutas /api/admin/* del backend pasan por `requiereLogin`, así que
 * cada pedido viaja con el header `Authorization: Bearer <token>`. El token lo
 * guarda y lo lee auth.ts.
 *
 * El backend contesta los errores siempre con la misma forma
 * ({ error, detalle? }), así que acá se traduce una sola vez a una excepción y
 * las pantallas no tienen que mirar `response.ok`.
 */
import { leerToken, cerrarSesion } from "../../lib/auth"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  status: number
  detalle?: unknown

  constructor(status: number, mensaje: string, detalle?: unknown) {
    super(mensaje)
    this.name = "ApiError"
    this.status = status
    this.detalle = detalle
  }
}

type Opciones = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  cuerpo?: unknown
  /** Parámetros de query; los `undefined` se descartan. */
  query?: Record<string, string | number | undefined>
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = "GET", cuerpo, query } = opciones

  const url = new URL(`${BASE}${ruta}`)
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined) url.searchParams.set(clave, String(valor))
  }

  const token = leerToken()
  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        ...(cuerpo ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    // fetch solo rechaza si no hubo respuesta: servidor apagado, CORS, sin red.
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está corriendo la API?")
  }

  if (respuesta.status === 401) {
    // El token venció (duran 8 horas) o es inválido: se corta la sesión y el
    // AdminLayout vuelve a mostrar el login.
    cerrarSesion()
    throw new ApiError(401, "La sesión venció. Volvé a iniciar sesión.")
  }

  if (respuesta.status === 204) return undefined as T

  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      (datos?.error as string) ?? `Error ${respuesta.status}`,
      datos?.detalle,
    )
  }

  return datos as T
}
