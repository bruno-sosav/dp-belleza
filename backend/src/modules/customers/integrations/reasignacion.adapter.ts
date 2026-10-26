/**
 * Al unir fichas, mueve lo de otros módulos: cobros vía pagos, recordatorios vía `clientes.alUnirFichas`.
 * TRANSITORIO: turnos y pedidos todavía con SQL directo.
 */
import type { RowDataPacket } from "mysql2"
import type { Transaccion } from "../../../core/transaccion.port.js"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { ReasignacionDeCliente } from "../models/clientes.ports.js"
import { pagos } from "../../payments/payments.module.js"

export type AlUnirFichas = (deId: number, aId: number, tx: Transaccion) => Promise<void>

export class MySqlReasignacionDeCliente implements ReasignacionDeCliente {
  constructor(private escuchas: AlUnirFichas[]) {}

  async reasignar(deId: number, aId: number, tx: Transaccion) {
    const conn = ejecutor(tx)
    const [[antes]] = await conn.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM turnos  WHERE cliente_id = ?) AS turnos,
              (SELECT COUNT(*) FROM pedidos WHERE cliente_id = ?) AS compras`,
      [deId, deId],
    )
    await conn.query("UPDATE turnos  SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
    await conn.query("UPDATE pedidos SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
    // Los cobros de la caja también: antes se quedaban sin clienta al borrar la otra ficha.
    await pagos.reasignarCliente(deId, aId, tx)
    for (const escuchar of this.escuchas) await escuchar(deId, aId, tx)
    return { turnos: Number(antes.turnos), compras: Number(antes.compras) }
  }
}
