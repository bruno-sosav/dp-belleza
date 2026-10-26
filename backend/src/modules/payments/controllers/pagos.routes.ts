/**
 * Públicas (/api/mercadopago): POST /webhook, GET /estado-pago
 * Panel (/api/admin): /caja, /cobros, /cobros/:id, /mercadopago, /mercadopago/probar.
 */
import { Router } from "express"
import type { PagosController } from "./pagos.controller.js"

export function rutasPagosWeb(c: PagosController): Router {
  const r = Router()
  // POST /webhook: para que llegue, la URL tiene que ser pública (en local no lo es: ver backend/README.md).
  r.post("/webhook", c.aviso)
  r.get("/estado-pago", c.estadoPago)
  return r
}

export function rutasPagosPanel(c: PagosController): Router {
  const r = Router()
  r.get("/caja", c.caja)
  r.post("/cobros", c.anotar)
  r.delete("/cobros/:id", c.borrar)
  r.get("/mercadopago", c.estadoCuenta)
  r.put("/mercadopago", c.guardarCuenta)
  r.post("/mercadopago/probar", c.probarCuenta)
  r.delete("/mercadopago", c.desconectar)
  return r
}
