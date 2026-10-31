/**
 * Pedidos de la tienda en el panel (bajo /api/admin, que exige sesión):
 *   GET   /pedidos?estado=&desde=&hasta=   lista
 *   GET   /pedidos/:id                      detalle con sus líneas
 *   PATCH /pedidos/:id/estado               { "estado": "confirmado" }
 */
import { Router } from "express"
import type { PedidosController } from "./pedidos.controller.js"

export function rutasPanelPedidos(c: PedidosController): Router {
  const r = Router()
  r.get("/pedidos", c.listar)
  r.get("/pedidos/:id", c.ver)
  r.patch("/pedidos/:id/estado", c.cambiarEstado)
  return r
}
