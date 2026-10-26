/** Bajo /api/auth: POST /login · GET /yo. */
import { Router } from "express"
import { limitarPorIp } from "../../../core/http/limitarPorIp.middleware.js"
import { requiereLogin } from "../../../core/http/sesion.middleware.js"
import type { SesionController } from "./sesion.controller.js"

export function rutasSesion(c: SesionController): Router {
  // Sin límite, se podrían probar contraseñas sin parar. 10 intentos cada 15
  // minutos alcanzan para equivocarse varias veces escribiendo la propia.
  const limiteLogin = limitarPorIp({
    maximo: 10,
    ventanaMs: 15 * 60_000,
    mensaje: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
  })
  const r = Router()
  r.post("/login", limiteLogin, c.login)
  r.get("/yo", requiereLogin, c.yo)
  return r
}
