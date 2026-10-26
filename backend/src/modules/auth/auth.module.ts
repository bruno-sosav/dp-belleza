/** Raíz de composición de auth (MySQL, bcrypt, JWT). No depende de otros módulos; requiereLogin vive en core. */
import { CambiarContrasena, EditarCuenta, GuardarAdmin, VerCuenta } from "./services/cuenta.usecases.js"
import { IniciarSesion } from "./services/sesion.usecases.js"
import { contrasenasBcrypt } from "./integrations/bcrypt.adapter.js"
import { sesionesJwt } from "./integrations/jwt.adapter.js"
import { MySqlUsuariosRepository } from "./repositories/usuario.repository.js"
import { CuentaController } from "./controllers/cuenta.controller.js"
import { SesionController } from "./controllers/sesion.controller.js"
import { rutasCuenta } from "./controllers/cuenta.routes.js"
import { rutasSesion } from "./controllers/sesion.routes.js"

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
