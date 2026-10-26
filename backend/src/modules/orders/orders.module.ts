/**
 * Módulo de pedidos de la tienda (orders). Raíz de composición: arma los casos
 * de uso con MySQL y con las fachadas de customers, catalog e inventory, y
 * exporta solo lo que el resto del sistema puede usar.
 */
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import { CrearPedido } from "./services/checkout.usecases.js"
import { CambiarEstadoPedido, ListarPedidos, VerPedido } from "./services/pedidos.usecases.js"
import { MySqlPedidoRepository } from "./repositories/pedido.repository.js"
import { MySqlPedidosQueries } from "./repositories/pedidos.queries.js"
import { catalogoDePedidos, clientesDePedidos, inventarioDePedidos } from "./integrations/pedidos.adapter.js"
import { CheckoutController } from "./controllers/checkout.controller.js"
import { PedidosController } from "./controllers/pedidos.controller.js"
import { rutasWebCheckout } from "./controllers/checkout.routes.js"
import { rutasPanelPedidos } from "./controllers/pedidos.routes.js"

const repo = new MySqlPedidoRepository()
const queries = new MySqlPedidosQueries()
const verPedido = new VerPedido(queries)

const checkout = new CheckoutController(
  new CrearPedido(repo, clientesDePedidos, catalogoDePedidos, inventarioDePedidos, unidadDeTrabajoMySql),
)
const panel = new PedidosController({
  listar: new ListarPedidos(queries),
  ver: verPedido,
  cambiarEstado: new CambiarEstadoPedido(repo, inventarioDePedidos, verPedido, unidadDeTrabajoMySql),
})

/** Lo que orders ofrece al resto del sistema. */
export const pedidos = {
  /** Checkout: se monta bajo /api/tienda. */
  rutasWeb: rutasWebCheckout(checkout),
  /** Pedidos del panel: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPanelPedidos(panel),
}
