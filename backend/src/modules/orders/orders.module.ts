/**
 * Módulo de pedidos de la tienda (orders). Raíz de composición: arma los casos
 * de uso con MySQL y con las fachadas de customers, catalog, inventory,
 * payments, shipping, giftcards y admin, y exporta solo lo que el resto del sistema puede usar.
 */
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import { relojDelSistema } from "../../core/reloj.port.js"
import { CrearPedido } from "./services/checkout.usecases.js"
import { CambiarEstadoPedido, EnvioDelPedido, ListarPedidos, VerPedido } from "./services/pedidos.usecases.js"
import { PagarPedido } from "./services/pagos.usecases.js"
import type { PagoDePedido } from "./models/pedido.model.js"
import { MySqlPedidoRepository } from "./repositories/pedido.repository.js"
import { MySqlPedidosQueries } from "./repositories/pedidos.queries.js"
import { pagos } from "../payments/payments.module.js"
import {
  ajustesDePedidos,
  cajaDePedidos,
  catalogoDePedidos,
  clientesDePedidos,
  enviosDePedidos,
  giftCardsDePedidos,
  inventarioDePedidos,
  pasarelaDePedidos,
} from "./integrations/pedidos.adapter.js"
import { CheckoutController } from "./controllers/checkout.controller.js"
import { PedidosController } from "./controllers/pedidos.controller.js"
import { rutasWebCheckout } from "./controllers/checkout.routes.js"
import { rutasPanelPedidos } from "./controllers/pedidos.routes.js"

const repo = new MySqlPedidoRepository()
const queries = new MySqlPedidosQueries()
const verPedido = new VerPedido(queries)

const pagar = new PagarPedido(repo, queries, pasarelaDePedidos, cajaDePedidos, unidadDeTrabajoMySql)

const checkout = new CheckoutController(
  new CrearPedido({
    pedidos: repo,
    clientes: clientesDePedidos,
    catalogo: catalogoDePedidos,
    inventario: inventarioDePedidos,
    pasarela: pasarelaDePedidos,
    envios: enviosDePedidos,
    giftCards: giftCardsDePedidos,
    ajustes: ajustesDePedidos,
    reloj: relojDelSistema,
    uow: unidadDeTrabajoMySql,
  }),
  pagar,
)

// El aviso de Mercado Pago de un pago "pedido-<id>" llega a pagos, que se lo pasa a orders.
pagos.conectarPedidos({ aplicarPago: (pedidoId, pago) => pagar.aplicar(pedidoId, pago) })
const panel = new PedidosController({
  listar: new ListarPedidos(queries),
  ver: verPedido,
  cambiarEstado: new CambiarEstadoPedido(repo, inventarioDePedidos, enviosDePedidos, giftCardsDePedidos, verPedido, unidadDeTrabajoMySql),
  envio: new EnvioDelPedido(enviosDePedidos, verPedido),
})

/** Lo que orders ofrece al resto del sistema. */
export const pedidos = {
  /** Checkout: se monta bajo /api/tienda. */
  rutasWeb: rutasWebCheckout(checkout),
  /** Pedidos del panel: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPanelPedidos(panel),

  /** Un pago aprobado de un pedido (lo usa el aviso de Mercado Pago; también los tests). */
  aplicarPago: (pedidoId: number, pago: PagoDePedido) => pagar.aplicar(pedidoId, pago),
}
