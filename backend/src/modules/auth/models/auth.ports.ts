/**
 * Puertos de auth. Las usuarias viven en MySQL, las contraseñas se guardan con
 * bcrypt y la sesión es un JWT: los casos de uso no saben ninguna de las tres
 * cosas.
 */
import type { Usuario, UsuarioDeSesion } from "./usuario.model.js"

export interface UsuariosRepository {
  /** Solo usuarias activas. */
  porEmail(email: string): Promise<Usuario | null>
  porId(id: number): Promise<Usuario | null>
  /** Lanza `conflicto` si el email ya lo usa otra cuenta. */
  actualizarDatos(id: number, datos: { nombre: string; email: string }): Promise<void>
  cambiarHash(id: number, hash: string): Promise<void>
  /** Crea la cuenta admin, o si el email ya existe le pone ese nombre y esa clave y la reactiva. */
  guardarAdmin(datos: { nombre: string; email: string; hash: string }): Promise<void>
}

export interface Contrasenas {
  hashear(clave: string): Promise<string>
  coincide(clave: string, hash: string): Promise<boolean>
}

export interface Sesiones {
  /** Devuelve el token que el panel manda en cada pedido. */
  abrir(usuario: UsuarioDeSesion): string
}
