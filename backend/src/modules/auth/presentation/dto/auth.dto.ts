/** Lo que SALE de auth. Nunca el hash de la contraseña. */
import type { Usuario, UsuarioDeSesion } from "../../domain/usuario.model.js"

/** Quién tiene la sesión abierta: lo que muestra el panel ("Sesión de Daniela"). */
export const aUsuarioDeSesion = (u: UsuarioDeSesion) => ({ id: u.id, nombre: u.nombre, rol: u.rol })

/** Respuesta del login. */
export const aSesion = (s: { token: string; usuario: UsuarioDeSesion }) => ({ token: s.token, usuario: aUsuarioDeSesion(s.usuario) })

/** Ajustes → Tu cuenta: lo que se edita en el formulario. */
export const aCuenta = (u: Usuario) => ({ nombre: u.nombre, email: u.email })

/** Después de guardar la cuenta: token nuevo, porque el nombre viaja adentro. */
export const aCuentaGuardada = (r: { usuario: UsuarioDeSesion; token: string; email: string }) => ({
  usuario: aUsuarioDeSesion(r.usuario),
  token: r.token,
  email: r.email,
})
