/** Rutas de las estadísticas en el panel (bajo /api/admin): /stats/dias, /stats/servicios, /stats/servicios-del-dia. */
import { Router } from "express"
import type { EstadisticasController } from "./estadisticas.controller.js"

export function rutasEstadisticasPanel(c: EstadisticasController): Router {
  const r = Router()
  r.get("/stats/dias", c.dias)
  r.get("/stats/servicios", c.servicios)
  r.get("/stats/servicios-del-dia", c.serviciosDelDia)
  return r
}
