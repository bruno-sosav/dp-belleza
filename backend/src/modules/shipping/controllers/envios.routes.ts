/**
 * Web (bajo /api/tienda):  GET /envios/cotizar?cp=7600&unidades=2&subtotal=25000
 * Panel (bajo /api/admin): GET/PUT/DELETE /andreani   la cuenta de la API de Andreani
 * El despacho y el seguimiento de un pedido están en orders (/pedidos/:id/envio…).
 */
import { Router } from "express"
import { limitarPorIp } from "../../../core/http/limitarPorIp.middleware.js"
import type { EnviosController } from "./envios.controller.js"

export function rutasWebEnvios(c: EnviosController): Router {
  const r = Router()
  // Cada cotización con Andreani es una llamada a su API: que no se pueda abusar.
  const limiteCotizar = limitarPorIp({ maximo: 60, ventanaMs: 15 * 60_000, mensaje: "Hiciste muchas consultas seguidas. Esperá unos minutos." })
  r.get("/envios/cotizar", limiteCotizar, c.cotizacion)
  return r
}

export function rutasPanelEnvios(c: EnviosController): Router {
  const r = Router()
  r.get("/andreani", c.cuenta)
  r.put("/andreani", c.guardarCuenta)
  r.delete("/andreani", c.borrarCuenta)
  return r
}
