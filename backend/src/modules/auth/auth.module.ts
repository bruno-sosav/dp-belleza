/**
 * Módulo de auth: el login del panel y "Tu cuenta". Raíz de composición: crea
 * las implementaciones concretas (MySQL, bcrypt, JWT), las inyecta en los
 * casos de uso y exporta solo lo que el resto del sistema puede usar.
 *
 * No depende de ningún otro módulo. Verificar la sesión en cada pedido es de
 * core (requiereLogin), porque lo usan todas las rutas del panel.
 */
import { CambiarContrasena, EditarCuenta, GuardarAdmin, VerCuenta } from "./application/cuenta.usecases.js"
import { IniciarSesion } from "./application/sesion.usecases.js"
import { contrasenasBcrypt } from "./infrastructure/bcrypt.adapter.js"
import { sesionesJwt } from "./infrastructure/jwt.adapter.js"
import { MySqlUsuariosRepository } from "./infrastructure/usuario.repository.js"
import { CuentaController } from "./presentation/controllers/cuenta.controller.js"
import { SesionController } from "./presentation/controllers/sesion.controller.js"
import { rutasCuenta } from "./presentation/routes/cuenta.routes.js"
import { rutasSesion } from "./presentation/routes/sesion.routes.js"

const usuarios = new MySqlUsuariosRepository()
const guardarAdmin = new GuardarAdmin(usuarios, contrasenasBcrypt)

/** Lo que auth ofrece al resto del sistema. */
export const auth = {
  /** Login: se monta bajo /api/auth. */
  rutasWeb: rutasSesion(new SesionController(new IniciarSesion(usuarios, contrasenasBcrypt, sesionesJwt))),
  /** Tu cuenta: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasCuenta(
    new CuentaController({
      ver: new VerCuenta(usuarios),
      editar: new EditarCuenta(usuarios, contrasenasBcrypt, sesionesJwt),
      cambiarContrasena: new CambiarContrasena(usuarios, contrasenasBcrypt),
    }),
  ),
  /** Para scripts/crear-admin.ts. */
  guardarAdmin: (nombre: string, email: string, clave: string) => guardarAdmin.ejecutar(nombre, email, clave),
}
