/** Casos de uso del inventario. Sin SQL ni Express. */
import { invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { StockRepository } from "../domain/inventario.ports.js"
import { conteoValido, problemasDeStock, type Linea, type ProblemaDeStock } from "../domain/stock.model.js"

/**
 * Al vender: si alcanza el stock de TODAS las líneas, lo descuenta; si no, no
 * toca nada y devuelve qué falta. Corre dentro de la transacción del pedido:
 * si después el pedido falla por otro motivo, el descuento se deshace.
 */
export class ReservarStock {
  constructor(private repo: StockRepository) {}

  async ejecutar(lineas: Linea[], tx: Transaccion): Promise<{ ok: true } | { ok: false; problemas: ProblemaDeStock[] }> {
    const stock = await this.repo.disponibles(
      lineas.map((l) => l.productoId),
      tx,
      { bloquear: true },
    )
    const problemas = problemasDeStock(lineas, stock)
    if (problemas.length) return { ok: false, problemas }
    await this.repo.mover(lineas, -1, tx)
    return { ok: true }
  }
}

/** Al cancelar un pedido: esas unidades vuelven a estar disponibles. */
export class DevolverStock {
  constructor(private repo: StockRepository) {}

  ejecutar(lineas: Linea[], tx: Transaccion): Promise<void> {
    return this.repo.mover(lineas, 1, tx)
  }
}

/** La dueña: llegó mercadería (suma) o contó lo que hay y lo corrige (fija). */
export class ReponerOAjustarStock {
  constructor(private repo: StockRepository) {}

  async reponer(productoId: number, cantidad: number): Promise<number> {
    if (!Number.isInteger(cantidad) || cantidad <= 0) throw invalido("Para reponer, la cantidad tiene que ser un número entero mayor que 0.")
    const actual = (await this.repo.disponibles([productoId])).get(productoId)
    if (actual === undefined) throw noEncontrado("Producto")
    await this.repo.mover([{ productoId, cantidad }], 1)
    return actual + cantidad
  }

  async ajustar(productoId: number, stock: number): Promise<number> {
    if (!conteoValido(stock)) throw invalido("El stock tiene que ser un número entero, 0 o más.")
    if (!(await this.repo.fijar(productoId, stock))) throw noEncontrado("Producto")
    return stock
  }
}
