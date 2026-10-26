/** Bajo /api/admin: GET /cuenta · PATCH /cuenta · POST /cuenta/contrasena. */
import { Router } from "express"
import type { CuentaController } from "./cuenta.controller.js"

export function rutasCuenta(c: CuentaController): Router {
  const r = Router()
  r.get("/cuenta", c.ver)
  r.patch("/cuenta", c.editar)
  r.post("/cuenta/contrasena", c.cambiarContrasena)
  return r
}
