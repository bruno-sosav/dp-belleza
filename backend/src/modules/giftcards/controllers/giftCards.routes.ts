/**
 * Web (bajo /api/tienda):
 *   POST /gift-cards                       compra en la web (queda esperando el pago)
 *   POST /gift-cards/pago/:token/pagar     link de Mercado Pago
 *   GET  /gift-cards/pago/:token           cómo quedó (y el código, si ya se pagó)
 *   GET  /gift-cards/saldo?codigo=…        cuánto le queda (para usarla en el checkout)
 * Panel (bajo /api/admin): GET/POST /gift-cards, GET /gift-cards/:id, POST /gift-cards/:id/anular
 */
import { Router } from "express"
import { limitarPorIp } from "../../../core/http/limitarPorIp.middleware.js"
import type { GiftCardsController } from "./giftCards.controller.js"

export function rutasWebGiftCards(c: GiftCardsController): Router {
  const r = Router()
  const limiteCompras = limitarPorIp({ maximo: 10, ventanaMs: 60 * 60_000, mensaje: "Hiciste muchas compras seguidas. Escribinos por WhatsApp." })
  // Cuenta los intentos fallidos: así nadie puede probar códigos hasta acertar uno.
  const limiteSaldo = limitarPorIp({ maximo: 15, ventanaMs: 15 * 60_000, soloFallidos: true, mensaje: "Probaste muchos códigos. Esperá unos minutos." })
  r.post("/gift-cards", limiteCompras, c.comprar)
  r.post("/gift-cards/pago/:token/pagar", c.linkDePago)
  r.get("/gift-cards/pago/:token", c.pago)
  r.get("/gift-cards/saldo", limiteSaldo, c.saldo)
  return r
}

export function rutasPanelGiftCards(c: GiftCardsController): Router {
  const r = Router()
  r.get("/gift-cards", c.listar)
  r.post("/gift-cards", c.vender)
  r.get("/gift-cards/:id", c.ver)
  r.post("/gift-cards/:id/anular", c.anular)
  return r
}
