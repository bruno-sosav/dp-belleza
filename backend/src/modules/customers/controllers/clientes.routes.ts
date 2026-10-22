/**
 * Rutas del panel para clientas. Se montan bajo /api/admin, que exige sesión.
 * Las URLs son las mismas de antes de la reorganización: el panel no cambia.
 */
import { Router } from "express"
import type { ClientesController } from "./clientes.controller.js"

export function rutasPanelClientes(c: ClientesController): Router {
  const r = Router()
  r.get("/clientes", c.listar)
  r.post("/clientes", c.crear)
  r.get("/clientes/:id", c.ficha)
  r.patch("/clientes/:id", c.actualizar)
  r.delete("/clientes/:id", c.eliminar)
  r.get("/clientes/:id/posibles-duplicados", c.posiblesDuplicados)
  r.post("/clientes/:id/unir", c.unir)
  return r
}
