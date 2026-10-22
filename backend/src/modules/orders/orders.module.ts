/**
 * Módulo de pedidos de la tienda (orders). Es la parte de Alan: los archivos
 * se movieron tal cual desde ecommerce/, admin/tienda.ts y shared/models/
 * (solo cambiaron las rutas de los import). Todavía no tiene la estructura de
 * los demás módulos (puertos, casos de uso, DTOs): este archivo solo expone
 * sus rutas con la misma forma que el resto.
 */
import { tienda } from "./controllers/checkout.routes.js"
import { adminTienda } from "./controllers/pedidosPanel.routes.js"

/** Lo que orders ofrece al resto del sistema. */
export const pedidos = {
  /** Checkout: se monta bajo /api/tienda. */
  rutasWeb: tienda,
  /** Pedidos del panel: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: adminTienda,
}
