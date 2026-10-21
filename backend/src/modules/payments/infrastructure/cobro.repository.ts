/** Cobros en MySQL: el ÚNICO lugar que escribe la tabla `cobros`. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Cobro, NuevoCobro } from "../domain/cobro.model.js"
import type { CobroRepository } from "../domain/pagos.ports.js"

export const aCobro = (r: RowDataPacket): Cobro => ({
  id: r.id,
  fechaHora: String(r.fecha_hora).slice(0, 16),
  monto: Number(r.monto),
  medio: r.medio,
  concepto: r.concepto,
  descripcion: r.descripcion,
  turnoId: r.turno_id,
  clienteId: r.cliente_id,
  mpPagoId: r.mp_pago_id,
})

export class MySqlCobroRepository implements CobroRepository {
  async registrar(c: NuevoCobro, tx?: Transaccion) {
    // IGNORE: un mp_pago_id repetido (el aviso de Mercado Pago puede llegar dos veces) no entra de nuevo.
    const [r] = await ejecutor(tx).query<ResultSetHeader>(
      `INSERT IGNORE INTO cobros (monto, medio, concepto, turno_id, cliente_id, descripcion, mp_pago_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.monto, c.medio, c.concepto, c.turnoId ?? null, c.clienteId ?? null, c.descripcion ?? null, c.mpPagoId ?? null],
    )
    return r.affectedRows ? r.insertId : null
  }

  async porId(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT * FROM cobros WHERE id = ?", [id])
    return rows[0] ? aCobro(rows[0]) : null
  }

  async borrar(id: number) {
    await ejecutor().query("DELETE FROM cobros WHERE id = ?", [id])
  }

  async anularDelTurno(turnoId: number, tx: Transaccion) {
    await ejecutor(tx).query("DELETE FROM cobros WHERE turno_id = ? AND concepto = 'turno'", [turnoId])
  }

  async cobradoPorTurnos(turnoIds: number[]) {
    if (!turnoIds.length) return new Map<number, number>()
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT turno_id, SUM(monto) AS total FROM cobros WHERE turno_id IN (?) GROUP BY turno_id",
      [turnoIds],
    )
    return new Map(rows.map((r) => [r.turno_id as number, Number(r.total)]))
  }

  async reasignarCliente(deId: number, aId: number, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE cobros SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
  }
}
