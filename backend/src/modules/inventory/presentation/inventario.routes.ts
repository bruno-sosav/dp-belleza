/**
 * Rutas del inventario en el panel (bajo /api/admin):
 *   PUT  /productos/:id/stock    { "stock": 12 }     contó lo que hay y lo corrige
 *   POST /productos/:id/reponer  { "cantidad": 6 }   llegó mercadería
 */
import { Router } from "express"
import type { InventarioController } from "./inventario.controller.js"

export function rutasPanelInventario(c: InventarioController): Router {
  const r = Router()
  r.put("/productos/:id/stock", c.ajustar)
  r.post("/productos/:id/reponer", c.reponer)
  return r
}
