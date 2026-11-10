/**
 * Checkout de la web (bajo /api/tienda):
 *   POST /pedidos                       crea el pedido
 *   GET  /pedidos/pago/:token           cómo quedó el pago (al volver de Mercado Pago)
 *   POST /pedidos/pago/:token/pagar     link de Mercado Pago para pagar o reintentar
 * Los productos y categorías para la web los sirve el catálogo (modules/catalog).
 */
import { Router } from "express"
import { limitarPorIp } from "../../../core/http/limitarPorIp.middleware.js"
import type { CheckoutController } from "./checkout.controller.js"

export function rutasWebCheckout(c: CheckoutController): Router {
  const r = Router()

  // Cuántos pedidos puede HACER una misma conexión por hora (solo cuentan los que salen bien):
  // cada pedido aparta stock, así nadie puede vaciar la tienda con pedidos que no paga.
  const limitePedidos = limitarPorIp({
    maximo: 10,
    ventanaMs: 60 * 60_000,
    soloExitosos: true,
    mensaje: "Hiciste muchos pedidos seguidos. Si necesitás algo más, escribinos por WhatsApp.",
  })

  // Y cuántos pueden FALLAR: así nadie prueba códigos de gift card a ciegas desde el checkout.
  const limiteFallidos = limitarPorIp({ maximo: 30, ventanaMs: 60 * 60_000, soloFallidos: true, mensaje: "Hubo muchos intentos fallidos. Esperá un rato o escribinos por WhatsApp." })

  r.post("/pedidos", limitePedidos, limiteFallidos, c.crear)
  r.get("/pedidos/pago/:token", c.pago)
  r.post("/pedidos/pago/:token/pagar", c.linkDePago)
  return r
}
