/** Días cerrados en MySQL (tabla `bloqueos`). */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { BloqueoRepository } from "../domain/agenda.ports.js"
import type { Bloqueo } from "../domain/bloqueo.model.js"
import { recortarAlDia } from "../domain/disponibilidad.model.js"

const aBloqueo = (r: RowDataPacket): Bloqueo => ({
  id: r.id,
  desde: String(r.fecha_hora_inicio).slice(0, 16),
  hasta: String(r.fecha_hora_fin).slice(0, 16),
  motivo: r.motivo,
})

export class MySqlBloqueoRepository implements BloqueoRepository {
  async vigentes(ahora: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT * FROM bloqueos WHERE fecha_hora_fin > ? ORDER BY fecha_hora_inicio LIMIT 200", [ahora])
    return rows.map(aBloqueo)
  }

  async entre(desde: string, hasta: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT * FROM bloqueos WHERE fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY) AND fecha_hora_fin > ? ORDER BY fecha_hora_inicio",
      [hasta, desde],
    )
    return rows.map(aBloqueo)
  }

  async ocupadoDelDia(fecha: string, tx?: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      "SELECT fecha_hora_inicio, fecha_hora_fin FROM bloqueos WHERE fecha_hora_inicio < ? AND fecha_hora_fin > ?",
      [`${fecha} 23:59:59`, `${fecha} 00:00:00`],
    )
    return rows.map((r) => recortarAlDia(String(r.fecha_hora_inicio), String(r.fecha_hora_fin), fecha))
  }

  async crear(d: Omit<Bloqueo, "id">) {
    const [r] = await ejecutor().query<ResultSetHeader>("INSERT INTO bloqueos (fecha_hora_inicio, fecha_hora_fin, motivo) VALUES (?, ?, ?)", [
      `${d.desde}:00`,
      `${d.hasta}:00`,
      d.motivo || null,
    ])
    return { id: r.insertId, desde: d.desde, hasta: d.hasta, motivo: d.motivo || null }
  }

  async eliminar(id: number) {
    const [r] = await ejecutor().query<ResultSetHeader>("DELETE FROM bloqueos WHERE id = ?", [id])
    return r.affectedRows > 0
  }
}
