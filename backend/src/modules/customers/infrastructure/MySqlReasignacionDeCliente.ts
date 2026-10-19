/**
 * TRANSITORIO. Implementa el puerto ReasignacionDeCliente moviendo de una
 * clienta a otra lo que tienen los demás módulos: turnos, pedidos, cobros de
 * la caja y recordatorios. Cuando se muden esos módulos, cada uno va a proveer
 * su propia reasignación y este archivo desaparece.
 */
import type { RowDataPacket } from "mysql2"
import type { Transaccion } from "../../../core/transaccion.js"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { ReasignacionDeCliente } from "../domain/ports.js"

export class MySqlReasignacionDeCliente implements ReasignacionDeCliente {
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
    await conn.query("UPDATE cobros  SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
    // Recordatorios de cumpleaños: si las dos ya tenían el mismo saludo de ese año, queda uno solo.
    await conn.query(
      `DELETE r FROM recordatorios r
         JOIN recordatorios q ON q.cliente_id = ? AND q.tipo_id = r.tipo_id AND q.anio = r.anio
        WHERE r.cliente_id = ?`,
      [aId, deId],
    )
    await conn.query("UPDATE recordatorios SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
    return { turnos: Number(antes.turnos), compras: Number(antes.compras) }
  }
}
