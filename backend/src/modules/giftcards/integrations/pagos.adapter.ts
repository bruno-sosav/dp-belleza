/** Cumplen los puertos de gift cards con la fachada de payments (caja y Mercado Pago). */
import { config } from "../../../core/app.config.js"
import { pagos, type MedioPago } from "../../payments/payments.module.js"
import { referenciaDeGiftCard } from "../models/giftCard.model.js"
import type { CajaDeGiftCards, PasarelaDeGiftCards } from "../models/giftCards.ports.js"

/** La caja: la venta de la gift card entra como un cobro más. */
export const cajaDeGiftCards: CajaDeGiftCards = {
  cobrarVenta: (c, tx) => pagos.cobrarGiftCard({ ...c, medio: c.medio as MedioPago }, tx),
}

/** Mercado Pago. La clienta vuelve a /gift-cards/pago de la web, con el token. */
export const pasarelaDeGiftCards: PasarelaDeGiftCards = {
  conectada: () => pagos.mercadoPagoConectado(),
  crearLink: ({ giftCardId, token, monto }) => {
    const vuelta = `${config.siteUrl}/gift-cards/pago?t=${token}`
    return pagos.crearLinkDePago({
      items: [{ titulo: "Gift card DP Belleza", cantidad: 1, precioUnitario: monto }],
      referencia: referenciaDeGiftCard(giftCardId),
      vuelta: { exito: vuelta, pendiente: vuelta, error: vuelta },
      ...(config.apiPublicUrl ? { notificacion: `${config.apiPublicUrl}/api/mercadopago/webhook` } : {}),
    })
  },
  consultarPago: (id) => pagos.consultarPago(id),
}
