/**
 * Pedidos de la tienda en el panel (bajo /api/admin, que exige sesión):
 *   GET   /pedidos?estado=&desde=&hasta=   lista
 *   GET   /pedidos/:id                      detalle con sus líneas
 *   PATCH /pedidos/:id/estado               { "estado": "confirmado" }
 *   POST  /pedidos/:id/envio/despachar      genera el envío (Andreani o modo prueba)
 *   GET   /pedidos/:id/envio/seguimiento    dónde está el paquete
 */
import { Router } from "express"
import type { PedidosController } from "./pedidos.controller.js"

export function rutasPanelPedidos(c: PedidosController): Router {
  const r = Router()
  r.get("/pedidos", c.listar)
  r.get("/pedidos/:id", c.ver)
  r.patch("/pedidos/:id/estado", c.cambiarEstado)
  r.post("/pedidos/:id/envio/despachar", c.despachar)
  r.get("/pedidos/:id/envio/seguimiento", c.seguimiento)
  return r
}
