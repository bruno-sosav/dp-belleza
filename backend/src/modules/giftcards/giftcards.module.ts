/**
 * Módulo de gift cards: se venden en la web (Mercado Pago) o en el local, y se
 * usan en la tienda online (orders) o en la caja del local (payments). Raíz de
 * composición: exporta solo lo que el resto del sistema puede usar.
 */
import { randomBytes } from "node:crypto"
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../core/transaccion.port.js"
import { pagos } from "../payments/payments.module.js"
import { clientes } from "../customers/customers.module.js"
import { AdministrarGiftCards, PagarGiftCard, UsarGiftCard, VenderEnElLocal, VenderEnLaWeb } from "./services/giftCards.usecases.js"
import { MySqlGiftCardRepository } from "./repositories/giftCard.repository.js"
import { cajaDeGiftCards, pasarelaDeGiftCards } from "./integrations/pagos.adapter.js"
import { GiftCardsController } from "./controllers/giftCards.controller.js"
import { rutasPanelGiftCards, rutasWebGiftCards } from "./controllers/giftCards.routes.js"
import type { PagoDeGiftCard } from "./models/giftCard.model.js"

const repo = new MySqlGiftCardRepository()
const azar = (n: number) => new Uint8Array(randomBytes(n))
const pagar = new PagarGiftCard(repo, pasarelaDeGiftCards, cajaDeGiftCards, unidadDeTrabajoMySql)
const usar = new UsarGiftCard(repo)
const normalizarTelefono = (texto: string) => clientes.normalizarTelefono(texto)
const controller = new GiftCardsController({
  venderWeb: new VenderEnLaWeb(repo, pasarelaDeGiftCards, azar, normalizarTelefono),
  venderLocal: new VenderEnElLocal(repo, cajaDeGiftCards, azar, normalizarTelefono, unidadDeTrabajoMySql),
  pagar,
  usar,
  administrar: new AdministrarGiftCards(repo, unidadDeTrabajoMySql),
})

// La caja (payments) no conoce este módulo: se le enchufa lo que necesita al arrancar.
pagos.conectarGiftCards({
  aplicarPago: (id, pago) => pagar.aplicar(id, pago),
  usar: (codigo, monto, descripcion, tx) => usar.usarPorCodigo(codigo, monto, descripcion, tx),
  reintegrar: (id, monto, descripcion, tx) => usar.reintegrar(id, monto, { descripcion }, tx),
})

/** Lo que gift cards ofrece al resto del sistema. */
export const giftCards = {
  /** Comprar y consultar el saldo desde la web: se monta bajo /api/tienda. */
  rutasWeb: rutasWebGiftCards(controller),
  /** Gift cards del panel: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPanelGiftCards(controller),

  // ----- para el checkout de la tienda (orders)
  /** Bloquea la gift card y dice cuánto se descuenta de una compra de `total`. */
  reservar: (codigo: string, total: number, tx: Transaccion) => usar.reservar(codigo, total, tx),
  descontar: (id: number, monto: number, pedidoId: number, tx: Transaccion) => usar.descontar(id, monto, { pedidoId, descripcion: `Pedido #${pedidoId} de la tienda` }, tx),
  reintegrar: (id: number, monto: number, pedidoId: number, tx: Transaccion) => usar.reintegrar(id, monto, { pedidoId, descripcion: `Pedido #${pedidoId} cancelado` }, tx),

  /** Un pago aprobado de una gift card (también para los tests). */
  aplicarPago: (id: number, pago: PagoDeGiftCard) => pagar.aplicar(id, pago),
}
