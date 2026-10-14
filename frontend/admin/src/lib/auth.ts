/**
 * Acceso al panel de administración.
 *
 * MOCK: sin backend, la contraseña se valida en el navegador comparando su hash
 * SHA-256 con VITE_ADMIN_PASSWORD_HASH (archivo .env.local). Evita que alguien
 * entre por casualidad, pero no es seguridad real: cuando exista la API, el login
 * se valida en el servidor contra usuarios.password_hash.
 *
 * Para cambiar la contraseña:  npm run admin:hash -- "nueva-clave"
 * y pegar el resultado en .env.local como VITE_ADMIN_PASSWORD_HASH.
 */

const SESSION_KEY = "dp-belleza:admin-session"
const PASSWORD_HASH: string | undefined = import.meta.env.VITE_ADMIN_PASSWORD_HASH

export const isAdminConfigured = Boolean(PASSWORD_HASH)

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function login(password: string) {
  if (!PASSWORD_HASH) return false
  const ok = (await sha256(password)) === PASSWORD_HASH.trim().toLowerCase()
  if (ok) {
    try {
      sessionStorage.setItem(SESSION_KEY, "1")
    } catch {
      // Sin sessionStorage la sesión dura hasta recargar.
    }
  }
  return ok
}

/** La sesión dura hasta cerrar la pestaña. */
export function hasSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1"
  } catch {
    return false
  }
}

export function logout() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nada que limpiar.
  }
}
