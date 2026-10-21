/** Puertos del inventario. La implementación MySQL está en infrastructure/. */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Linea } from "./stock.model.js"

export interface StockRepository {
  /**
   * Unidades disponibles de esos productos. Con `bloquear`, nadie más puede
   * tocar ese stock hasta que termine la transacción: así dos compras al mismo
   * tiempo no venden la misma unidad.
   */
  disponibles(productoIds: number[], tx?: Transaccion, opciones?: { bloquear?: boolean }): Promise<Map<number, number>>
  /** Resta (vender) o suma (devolver, reponer) unidades. */
  mover(lineas: Linea[], signo: -1 | 1, tx?: Transaccion): Promise<void>
  /** Fija el conteo de un producto. false si el producto no existe. */
  fijar(productoId: number, stock: number): Promise<boolean>
}
