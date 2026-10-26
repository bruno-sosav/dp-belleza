/** Web: GET /api/configuracion · Panel: GET y PATCH /api/admin/configuracion. */
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
