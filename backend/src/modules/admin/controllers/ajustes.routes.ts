/**
 * Rutas de los ajustes. Mismas URLs de antes:
 *   web, bajo /api/configuracion:  GET /
 *   panel, bajo /api/admin:        GET /configuracion, PATCH /configuracion
 */
import { Router } from "express"
import type { AjustesController } from "./ajustes.controller.js"

export function rutasAjustesWeb(c: AjustesController): Router {
  const r = Router()
  r.get("/", c.publicos)
  return r
}

export function rutasAjustesPanel(c: AjustesController): Router {
  const r = Router()
  r.get("/configuracion", c.delPanel)
  r.patch("/configuracion", c.guardar)
  return r
}
