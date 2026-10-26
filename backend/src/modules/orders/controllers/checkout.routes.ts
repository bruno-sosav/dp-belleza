/**
 * Checkout de la web (bajo /api/tienda):
 *   POST /pedidos    crea el pedido
 * Los productos y categorías para la web los sirve el catálogo (modules/catalog).
 */
import { Router } from "express"
import type { CheckoutController } from "./checkout.controller.js"

export function rutasWebCheckout(c: CheckoutController): Router {
  const r = Router()
  r.post("/pedidos", c.crear)
  return r
}
