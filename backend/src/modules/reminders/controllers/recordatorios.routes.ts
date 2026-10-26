/**
 * Bajo /api/admin: GET/POST /recordatorios, DELETE /recordatorios/:id,
 * GET/POST /recordatorios/tipos, PATCH/DELETE /recordatorios/tipos/:id.
 */
import { Router } from "express"
import type { RecordatoriosController } from "./recordatorios.controller.js"

export function rutasPanelRecordatorios(c: RecordatoriosController): Router {
  const r = Router()
  // /tipos antes que /:id
  r.get("/recordatorios/tipos", c.tipos)
  r.post("/recordatorios/tipos", c.crearTipo)
  r.patch("/recordatorios/tipos/:id", c.actualizarTipo)
  r.delete("/recordatorios/tipos/:id", c.borrarTipo)
  r.get("/recordatorios", c.paraMandar)
  r.post("/recordatorios", c.marcar)
  r.delete("/recordatorios/:id", c.deshacer)
  return r
}
