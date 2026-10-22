/**
 * Sesión del panel: dónde se guardan el token y el usuario. El pedido de login
 * está en features/auth/api/sesion.api.ts.
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
 */

const CLAVE_TOKEN = "dp-belleza:admin-token"
const CLAVE_USUARIO = "dp-belleza:admin-usuario"

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

/** Guarda el token y el usuario que devolvió el login. */
export function guardarSesion(token: string, usuario: Usuario) {
  guardar(CLAVE_TOKEN, token)
  guardar(CLAVE_USUARIO, JSON.stringify(usuario))
}

/** Evento que avisa que cambió el usuario de la sesión (por ejemplo, su nombre en Ajustes → Tu cuenta). */
export const EVENTO_SESION = "dp-sesion"

/** Reemplaza el token y el usuario de la sesión abierta, sin volver a pedir login. */
export function actualizarSesion(token: string, usuario: Usuario) {
  guardarSesion(token, usuario)
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
