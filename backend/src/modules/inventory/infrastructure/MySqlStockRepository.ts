/** Stock en MySQL: hoy es la columna `productos.stock`. El único lugar que la modifica. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { Transaccion } from "../../../core/transaccion.js"
import type { StockRepository } from "../domain/ports.js"
import type { Linea } from "../domain/stock.js"

export class MySqlStockRepository implements StockRepository {
  async disponibles(productoIds: number[], tx?: Transaccion, { bloquear = false } = {}) {
    if (!productoIds.length) return new Map<number, number>()
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT id, stock FROM productos WHERE id IN (?) ${bloquear ? "FOR UPDATE" : ""}`,
      [productoIds],
    )
    return new Map(rows.map((r) => [r.id as number, Number(r.stock)]))
  }

  async mover(lineas: Linea[], signo: -1 | 1, tx?: Transaccion) {
    for (const l of lineas) {
      await ejecutor(tx).query("UPDATE productos SET stock = stock + ? WHERE id = ?", [signo * l.cantidad, l.productoId])
    }
  }

  async fijar(productoId: number, stock: number) {
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE productos SET stock = ? WHERE id = ?", [stock, productoId])
    return r.affectedRows > 0
  }
}
