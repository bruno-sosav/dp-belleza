/**
 * Sesión del panel.
 *
 * El login se valida en el SERVIDOR: POST /api/auth/login compara la contraseña
 * contra `usuarios.password_hash` con bcrypt y devuelve un JWT que dura 8 horas.
 *
 * Antes esto se hacía en el navegador, comparando un hash SHA-256 contra una
 * variable de entorno (VITE_ADMIN_PASSWORD_HASH). Eso evitaba que alguien
 * entrara por casualidad, pero el hash viajaba en el bundle y cualquiera con las
 * herramientas de desarrollo lo leía: no era seguridad real. Ahora sí lo es.
 *
 * El token va en sessionStorage y no en localStorage a propósito: la sesión
 * muere al cerrar la pestaña. Si la dueña usa el panel en la tablet del local,
 * no queda abierto para el siguiente que lo agarre.
 *
 * Este archivo NO importa api.ts: el login es el único pedido que no lleva token,
 * y así se evita que los dos módulos se importen en círculo.
 */

const CLAVE_TOKEN = "dp-belleza:admin-token"
const CLAVE_USUARIO = "dp-belleza:admin-usuario"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export type Usuario = {
  id: number
  nombre: string
  rol: "admin" | "empleado"
}

/** Lee de sessionStorage sin romperse si está bloqueado (modo privado, etc.). */
function leer(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardar(clave: string, valor: string) {
  try {
    sessionStorage.setItem(clave, valor)
  } catch {
    // Sin sessionStorage la sesión dura hasta recargar la página.
  }
}

export function leerToken(): string | null {
  return leer(CLAVE_TOKEN)
}

export function haySesion(): boolean {
  return leerToken() !== null
}

export function usuarioActual(): Usuario | null {
  const crudo = leer(CLAVE_USUARIO)
  if (!crudo) return null
  try {
    return JSON.parse(crudo) as Usuario
  } catch {
    return null
  }
}

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
  guardar(CLAVE_TOKEN, token)
  guardar(CLAVE_USUARIO, JSON.stringify(usuario))
  return usuario
}

/** Evento que avisa que cambió el usuario de la sesión (por ejemplo, su nombre en Ajustes → Tu cuenta). */
export const EVENTO_SESION = "dp-sesion"

/** Reemplaza el token y el usuario de la sesión abierta, sin volver a pedir login. */
export function actualizarSesion(token: string, usuario: Usuario) {
  guardar(CLAVE_TOKEN, token)
  guardar(CLAVE_USUARIO, JSON.stringify(usuario))
  window.dispatchEvent(new Event(EVENTO_SESION))
}

export function cerrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_TOKEN)
    sessionStorage.removeItem(CLAVE_USUARIO)
  } catch {
    // Nada que limpiar.
  }
}
