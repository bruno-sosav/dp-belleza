/**
 * Login del panel: POST /api/auth/login.
 *
 * Este archivo NO usa api.ts: el login es el único pedido que no lleva token,
 * y así api.ts no depende de esta sección.
 */
import { guardarSesion } from "../../../shared/lib/sesion"
import type { Usuario } from "../../../shared/lib/sesion"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * Inicia sesión. Devuelve el usuario, o lanza con el mensaje que mandó el
 * servidor ("Email o contraseña incorrectos") para mostrarlo tal cual.
 */
export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error("No se pudo conectar con el servidor. ¿Está corriendo la API?")
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error((datos?.error as string) ?? "No se pudo iniciar sesión.")
  }

  const { token, usuario } = datos as { token: string; usuario: Usuario }
  guardarSesion(token, usuario)
  return usuario
}
