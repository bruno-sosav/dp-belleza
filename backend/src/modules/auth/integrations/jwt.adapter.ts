/** JWT de 8 horas; lo firma y verifica core/http/sesion.middleware. */
import { firmarToken } from "../../../core/http/sesion.middleware.js"
import type { Sesiones } from "../models/auth.ports.js"

export const sesionesJwt: Sesiones = {
  abrir: (usuario) => firmarToken(usuario),
}
