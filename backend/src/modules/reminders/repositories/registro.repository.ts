/** Lo ya mandado u omitido (tabla `recordatorios`): el ÚNICO lugar que la escribe. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { EstadoRecordatorio, Registro } from "../models/recordatorio.model.js"
import type { RegistroRepository } from "../models/recordatorios.ports.js"

export class MySqlRegistroRepository implements RegistroRepository {
  async marcar(r: Registro, estado: EstadoRecordatorio) {
    const [res] = await ejecutor().query<ResultSetHeader>(
      `INSERT INTO recordatorios (tipo_id, turno_id, cliente_id, anio, estado, enviado_at, intentos)
       VALUES (?, ?, ?, ?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE estado = VALUES(estado), enviado_at = NOW(), intentos = intentos + 1`,
      [r.tipoId, r.turnoId ?? null, r.clienteId ?? null, r.anio ?? null, estado],
    )
    return res.insertId
  }

  async deshacer(id: number) {
    const [r] = await ejecutor().query<ResultSetHeader>("DELETE FROM recordatorios WHERE id = ?", [id])
    return r.affectedRows > 0
  }

  async hechosDeTurnos(turnoIds: number[]) {
    if (!turnoIds.length) return []
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT turno_id, tipo_id FROM recordatorios WHERE turno_id IN (?)", [turnoIds])
    return rows.map((r) => ({ turnoId: r.turno_id as number, tipoId: r.tipo_id as number }))
  }

  async hechosDeCumple(tipoIds: number[]) {
    if (!tipoIds.length) return []
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT tipo_id, cliente_id, anio FROM recordatorios WHERE cliente_id IS NOT NULL AND tipo_id IN (?)",
      [tipoIds],
    )
    return rows.map((r) => ({ tipoId: r.tipo_id as number, clienteId: r.cliente_id as number, anio: r.anio as number }))
  }

  async olvidarDelTurno(turnoId: number, tx: Transaccion) {
    await ejecutor(tx).query("DELETE FROM recordatorios WHERE turno_id = ?", [turnoId])
  }

  async reasignarCliente(deId: number, aId: number, tx: Transaccion) {
    const conn = ejecutor(tx)
    // Cumpleaños: si las dos ya tenían el mismo saludo de ese año, queda uno solo.
    await conn.query(
      `DELETE r FROM recordatorios r
         JOIN recordatorios q ON q.cliente_id = ? AND q.tipo_id = r.tipo_id AND q.anio = r.anio
        WHERE r.cliente_id = ?`,
      [aId, deId],
    )
    await conn.query("UPDATE recordatorios SET cliente_id = ? WHERE cliente_id = ?", [aId, deId])
  }
}
