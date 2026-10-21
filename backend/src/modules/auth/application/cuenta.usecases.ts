/**
 * Ajustes → Tu cuenta: la usuaria del panel cambia su nombre, su email de
 * ingreso y su contraseña.
 *
 * Cambiar el email o la contraseña pide la contraseña actual: si alguien
 * encuentra la sesión abierta en la compu del local, no puede quedarse con la
 * cuenta.
 */
import { invalido, noEncontrado } from "../../../core/negocio.error.js"
import { cambiaElEmail, deSesion, problemaDeContrasena, type Usuario, type UsuarioDeSesion } from "../domain/usuario.model.js"
import type { Contrasenas, Sesiones, UsuariosRepository } from "../domain/auth.ports.js"

async function buscar(usuarios: UsuariosRepository, id: number): Promise<Usuario> {
  const u = await usuarios.porId(id)
  if (!u) throw noEncontrado("Usuario")
  return u
}

async function verificarActual(contrasenas: Contrasenas, u: Usuario, actual: string | undefined) {
  if (!actual || !(await contrasenas.coincide(actual, u.passwordHash))) throw invalido("La contraseña actual no es correcta.")
}

export class VerCuenta {
  constructor(private usuarios: UsuariosRepository) {}

  ejecutar(id: number): Promise<Usuario> {
    return buscar(this.usuarios, id)
  }
}

export class EditarCuenta {
  constructor(
    private usuarios: UsuariosRepository,
    private contrasenas: Contrasenas,
    private sesiones: Sesiones,
  ) {}

  /** Devuelve un token nuevo: el nombre viaja adentro del token ("Sesión de Daniela"). */
  async ejecutar(id: number, cambios: { nombre?: string; email?: string; contrasenaActual?: string }): Promise<{ usuario: UsuarioDeSesion; token: string; email: string }> {
    const u = await buscar(this.usuarios, id)
    const email = cambiaElEmail(u.email, cambios.email) ? cambios.email! : u.email
    if (email !== u.email) await verificarActual(this.contrasenas, u, cambios.contrasenaActual)
    const nombre = cambios.nombre ?? u.nombre
    await this.usuarios.actualizarDatos(u.id, { nombre, email })
    const usuario = deSesion({ ...u, nombre })
    return { usuario, token: this.sesiones.abrir(usuario), email }
  }
}

export class CambiarContrasena {
  constructor(
    private usuarios: UsuariosRepository,
    private contrasenas: Contrasenas,
  ) {}

  async ejecutar(id: number, actual: string, nueva: string): Promise<void> {
    const problema = problemaDeContrasena(nueva)
    if (problema) throw invalido(problema)
    const u = await buscar(this.usuarios, id)
    await verificarActual(this.contrasenas, u, actual)
    if (actual === nueva) throw invalido("La contraseña nueva tiene que ser distinta de la actual.")
    await this.usuarios.cambiarHash(u.id, await this.contrasenas.hashear(nueva))
  }
}

/** Para el script `npm run crear-admin`: crea la cuenta o le cambia la clave. */
export class GuardarAdmin {
  constructor(
    private usuarios: UsuariosRepository,
    private contrasenas: Contrasenas,
  ) {}

  async ejecutar(nombre: string, email: string, clave: string): Promise<void> {
    const problema = problemaDeContrasena(clave)
    if (problema) throw invalido(problema)
    await this.usuarios.guardarAdmin({ nombre, email, hash: await this.contrasenas.hashear(clave) })
  }
}
