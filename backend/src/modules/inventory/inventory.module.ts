/**
 * Módulo de inventario (inventory): el stock de la tienda. Raíz de
 * composición: arma los casos de uso con el repositorio MySQL y exporta solo
 * lo que el resto del sistema puede usar.
 */
import type { Transaccion } from "../../core/transaccion.js"
import { DevolverStock, ReponerOAjustarStock, ReservarStock } from "./application/casosDeUso.js"
import type { Linea } from "./domain/stock.js"
import { MySqlStockRepository } from "./infrastructure/MySqlStockRepository.js"
import { InventarioController } from "./presentation/controllers/inventario.controller.js"
import { rutasPanelInventario } from "./presentation/routes/inventario.routes.js"

const repo = new MySqlStockRepository()
const reservar = new ReservarStock(repo)
const devolver = new DevolverStock(repo)

export type { Linea }

/** Lo que el inventario ofrece al resto del sistema. */
export const inventario = {
  /** Reponer y ajustar stock desde el panel. Se monta bajo /api/admin. */
  rutasPanel: rutasPanelInventario(new InventarioController(new ReponerOAjustarStock(repo))),

  /** La venta: descuenta si alcanza para todo; si no, devuelve qué falta y no toca nada. */
  reservar: (lineas: Linea[], tx: Transaccion) => reservar.ejecutar(lineas, tx),

  /** La cancelación de un pedido: esas unidades vuelven a estar disponibles. */
  devolver: (lineas: Linea[], tx: Transaccion) => devolver.ejecutar(lineas, tx),
}
