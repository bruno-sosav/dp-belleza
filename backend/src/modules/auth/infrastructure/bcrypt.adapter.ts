/** Las contraseñas se guardan con bcrypt (costo 12): nunca en texto plano. */
import bcrypt from "bcryptjs"
import type { Contrasenas } from "../domain/auth.ports.js"

export const contrasenasBcrypt: Contrasenas = {
  hashear: (clave) => bcrypt.hash(clave, 12),
  coincide: (clave, hash) => bcrypt.compare(clave, hash),
}
