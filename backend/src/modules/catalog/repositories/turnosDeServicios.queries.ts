/** TRANSITORIO: lee la tabla de turnos (de otro módulo). Debería proveerlo appointments. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { TurnosDeServicios } from "../models/catalogo.ports.js"

export class MySqlTurnosDeServicios implements TurnosDeServicios {
  async pedidosAFuturo(servicioIds: number[]) {
    if (!servicioIds.length) return new Map<number, number>()
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT servicio_id, COUNT(*) AS n FROM turnos
        WHERE servicio_id IN (?) AND estado IN ('reservado', 'confirmado') AND fecha_hora_inicio >= NOW()
        GROUP BY servicio_id`,
      [servicioIds],
    )
    return new Map(rows.map((r) => [r.servicio_id as number, Number(r.n)]))
  }
}
