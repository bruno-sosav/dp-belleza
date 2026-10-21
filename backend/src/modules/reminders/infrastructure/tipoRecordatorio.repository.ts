/** Tipos de recordatorio en MySQL (tabla `tipos_recordatorio`). El nombre del servicio se lee para mostrarlo. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { DatosTipo, Tipo } from "../domain/recordatorio.model.js"
import type { TipoRepository } from "../domain/recordatorios.ports.js"

const SELECT_TIPO = `
  SELECT tr.*, s.nombre AS servicio_nombre
    FROM tipos_recordatorio tr
    LEFT JOIN servicios s ON s.id = tr.servicio_id`

const aTipo = (r: RowDataPacket): Tipo => ({
  id: r.id,
  nombre: r.nombre,
  momento: r.momento,
  horasAntes: r.horas_antes,
  dias: r.dias,
  servicio: r.servicio_id ? { id: r.servicio_id, nombre: r.servicio_nombre } : null,
  mensaje: r.mensaje,
})

const aColumnas = (d: DatosTipo) => ({
  nombre: d.nombre,
  momento: d.momento,
  mensaje: d.mensaje,
  horas_antes: d.momento === "antes" ? d.horasAntes : null,
  dias: d.momento === "antes" ? null : d.dias,
  servicio_id: d.momento === "despues" ? d.servicioId : null,
})

export class MySqlTipoRepository implements TipoRepository {
  async listar() {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `${SELECT_TIPO} WHERE tr.activo = 1
        ORDER BY FIELD(tr.momento, 'antes', 'despues', 'cumpleanos'), tr.horas_antes DESC, tr.dias, tr.id`,
    )
    return rows.map(aTipo)
  }

  async porId(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`${SELECT_TIPO} WHERE tr.id = ? AND tr.activo = 1`, [id])
    return rows[0] ? aTipo(rows[0]) : null
  }

  async crear(d: DatosTipo) {
    const [r] = await ejecutor().query<ResultSetHeader>("INSERT INTO tipos_recordatorio SET ?", [aColumnas(d)])
    return r.insertId
  }

  async actualizar(id: number, d: DatosTipo) {
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE tipos_recordatorio SET ? WHERE id = ? AND activo = 1", [aColumnas(d), id])
    return r.affectedRows > 0
  }

  async desactivar(id: number) {
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE tipos_recordatorio SET activo = 0 WHERE id = ? AND activo = 1", [id])
    return r.affectedRows > 0
  }
}
