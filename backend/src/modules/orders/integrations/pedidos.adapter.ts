/** Cumplen los puertos de orders con lo que exportan los otros módulos (su fachada, nunca sus repositories). */
import { config } from "../../../core/app.config.js"
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { inventario } from "../../inventory/inventory.module.js"
import { pagos } from "../../payments/payments.module.js"
import { envios } from "../../shipping/shipping.module.js"
import { giftCards } from "../../giftcards/giftcards.module.js"
import { ajustes } from "../../admin/admin.module.js"
import { referenciaDePedido } from "../models/pedido.model.js"
import type {
  AjustesDePedidos,
  CajaDePedidos,
  CatalogoDePedidos,
  ClientesDePedidos,
  EnviosDePedidos,
  GiftCardsDePedidos,
  InventarioDePedidos,
  PasarelaDePedidos,
} from "../models/pedidos.ports.js"

/** Clientas: el módulo customers (la misma ficha que usa la turnera). */
export const clientesDePedidos: ClientesDePedidos = {
  buscarOCrear: (datos, tx) => clientes.buscarOCrear(datos, tx),
  cumple: (clienteId, tx) => clientes.cumpleDe(clienteId, tx),
}

/** Ajustes del local: el módulo admin. */
export const ajustesDePedidos: AjustesDePedidos = {
  descuentoCumple: () => ajustes.descuentoCumple(),
}

/** Precios: el módulo catalog. */
export const catalogoDePedidos: CatalogoDePedidos = {
  vendibles: (ids, tx) => catalogo.productosParaVender(ids, tx),
}

/** Stock: el módulo inventory. */
export const inventarioDePedidos: InventarioDePedidos = {
  reservar: (lineas, tx) => inventario.reservar(lineas, tx),
  devolver: (lineas, tx) => inventario.devolver(lineas, tx),
}

/** Mercado Pago: el módulo payments. La clienta vuelve a /pedido/pago de la web, con el token. */
export const pasarelaDePedidos: PasarelaDePedidos = {
  conectada: () => pagos.mercadoPagoConectado(),
  crearLink: ({ pedidoId, token, lineas }) => {
    const vuelta = `${config.siteUrl}/pedido/pago?t=${token}`
    return pagos.crearLinkDePago({
      items: lineas.map((l) => ({ titulo: l.nombre, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
      referencia: referenciaDePedido(pedidoId),
      vuelta: { exito: vuelta, pendiente: vuelta, error: vuelta },
      ...(config.apiPublicUrl ? { notificacion: `${config.apiPublicUrl}/api/mercadopago/webhook` } : {}),
    })
  },
  consultarPago: (id) => pagos.consultarPago(id),
}

/** La caja: el módulo payments. */
export const cajaDePedidos: CajaDePedidos = {
  cobrar: (c, tx) => pagos.cobrarPedido(c, tx),
}

/** Envíos: el módulo shipping. */
export const enviosDePedidos: EnviosDePedidos = {
  cotizar: (d) => envios.cotizar(d),
  registrar: (pedidoId, destino, c, tx) => envios.registrar(pedidoId, destino, c, tx),
  despachar: (d) => envios.despachar(d),
  seguimiento: (pedidoId) => envios.seguimiento(pedidoId),
  marcarEntregado: (pedidoId, tx) => envios.marcarEntregado(pedidoId, tx),
}

/** Gift cards: el módulo giftcards. */
export const giftCardsDePedidos: GiftCardsDePedidos = {
  reservar: (codigo, total, tx) => giftCards.reservar(codigo, total, tx),
  descontar: (id, monto, pedidoId, tx) => giftCards.descontar(id, monto, pedidoId, tx),
  reintegrar: (id, monto, pedidoId, tx) => giftCards.reintegrar(id, monto, pedidoId, tx),
}
