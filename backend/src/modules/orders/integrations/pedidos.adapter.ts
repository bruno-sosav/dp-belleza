/** Cumplen los puertos de orders con lo que exportan los otros módulos (su fachada, nunca sus repositories). */
import { config } from "../../../core/app.config.js"
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { inventario } from "../../inventory/inventory.module.js"
import { pagos } from "../../payments/payments.module.js"
import { referenciaDePedido } from "../models/pedido.model.js"
import type { CajaDePedidos, CatalogoDePedidos, ClientesDePedidos, InventarioDePedidos, PasarelaDePedidos } from "../models/pedidos.ports.js"

/** Clientas: el módulo customers (la misma ficha que usa la turnera). */
export const clientesDePedidos: ClientesDePedidos = {
  buscarOCrear: (datos, tx) => clientes.buscarOCrear(datos, tx),
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
