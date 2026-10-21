/** Entrar al panel. */
import { noAutorizado } from "../../../core/negocio.error.js"
import { deSesion, type UsuarioDeSesion } from "../domain/usuario.model.js"
import type { Contrasenas, Sesiones, UsuariosRepository } from "../domain/auth.ports.js"

export class IniciarSesion {
  constructor(
    private usuarios: UsuariosRepository,
    private contrasenas: Contrasenas,
    private sesiones: Sesiones,
  ) {}

  async ejecutar(email: string, clave: string): Promise<{ token: string; usuario: UsuarioDeSesion }> {
    const u = await this.usuarios.porEmail(email)
    // Mismo mensaje si no existe el email o si la clave está mal, para no revelar qué emails hay.
    if (!u || !(await this.contrasenas.coincide(clave, u.passwordHash))) throw noAutorizado("Email o contraseña incorrectos")
    const usuario = deSesion(u)
    return { token: this.sesiones.abrir(usuario), usuario }
  }
}
