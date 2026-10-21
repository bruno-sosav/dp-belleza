/**
 * La sesión es un JWT de 8 horas. Lo firma core (core/http/sesion.middleware),
 * que es también quien lo verifica en cada pedido del panel (requiereLogin).
 */
import { firmarToken } from "../../../core/http/sesion.middleware.js"
import type { Sesiones } from "../domain/auth.ports.js"

export const sesionesJwt: Sesiones = {
  abrir: (usuario) => firmarToken(usuario),
}
