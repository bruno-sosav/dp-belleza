/** Mercado Pago del local, desde el módulo de pagos. */
import { pagos } from "../../payments/payments.module.js"
import type { MercadoPagoDelLocal } from "../models/admin.ports.js"

export const mercadoPagoDelLocal: MercadoPagoDelLocal = {
  conectado: () => pagos.mercadoPagoConectado(),
  publicKey: () => pagos.publicKey(),
}
