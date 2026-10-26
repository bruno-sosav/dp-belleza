/** Usuarias del panel y reglas de la cuenta. */
export type Rol = "admin" | "empleado"

export type Usuario = {
  id: number
  nombre: string
  email: string
  rol: Rol
  passwordHash: string
}

/** Lo que viaja dentro de la sesión (el token): nunca el email ni el hash. */
export type UsuarioDeSesion = { id: number; nombre: string; rol: Rol }

export const deSesion = (u: Pick<Usuario, "id" | "nombre" | "rol">): UsuarioDeSesion => ({ id: u.id, nombre: u.nombre, rol: u.rol })

/** `null` si sirve; si no, el motivo para mostrar. */
export function problemaDeContrasena(clave: string): string | null {
  if (clave.length < 8) return "La contraseña nueva tiene que tener al menos 8 caracteres"
  if (clave.length > 100) return "La contraseña nueva es demasiado larga"
  if (clave.trim().length !== clave.length) return "La contraseña no puede empezar ni terminar con espacios"
  return null
}

/** El email es el mismo aunque cambien mayúsculas: eso no cuenta como cambio. */
export const cambiaElEmail = (actual: string, nuevo: string | undefined) => nuevo !== undefined && nuevo.toLowerCase() !== actual.toLowerCase()
