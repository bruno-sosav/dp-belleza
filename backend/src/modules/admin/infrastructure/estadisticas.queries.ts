/**
 * Vistas de lectura de las estadísticas: agregan turnos y servicios (de otros
 * módulos) con GROUP BY en la base, en vez de traer miles de filas. Nunca
 * escriben esas tablas.
 *
 * TODO (tienda): sumar los pedidos por día cuando se conecte la tienda.
 */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { ServicioHecho } from "../domain/estadisticas.model.js"
import type { ConsultasDeEstadisticas } from "../domain/admin.ports.js"

const aServicio = (r: RowDataPacket): ServicioHecho => ({ id: r.id, nombre: r.nombre, cantidad: Number(r.cantidad), ganancia: Number(r.ganancia) })

export class MySqlConsultasDeEstadisticas implements ConsultasDeEstadisticas {
  async movimientoPorDia(desde: string, hasta: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT DATE(fecha_hora_inicio)                                      AS fecha,
              SUM(CASE WHEN estado = 'completado' THEN precio ELSE 0 END)  AS ganancia,
              SUM(estado = 'completado')                                   AS realizados,
              SUM(estado = 'cancelado')                                    AS cancelados,
              SUM(estado = 'ausente')                                      AS ausentes
         FROM turnos
        WHERE fecha_hora_inicio >= ? AND fecha_hora_inicio < ?
        GROUP BY fecha`,
      [desde, hasta],
    )
    return rows.map((r) => ({ fecha: String(r.fecha), ganancia: Number(r.ganancia), realizados: Number(r.realizados), cancelados: Number(r.cancelados), ausentes: Number(r.ausentes) }))
  }

  async serviciosHechos(desde: string, hasta: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT s.id, s.nombre, COUNT(*) AS cantidad, SUM(t.precio) AS ganancia
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
        WHERE t.estado = 'completado' AND t.fecha_hora_inicio >= ? AND t.fecha_hora_inicio < ?
        GROUP BY s.id, s.nombre
        ORDER BY cantidad DESC, ganancia DESC`,
      [desde, hasta],
    )
    return rows.map(aServicio)
  }

  async serviciosDelDia(fecha: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT s.id, s.nombre, COUNT(*) AS cantidad, SUM(t.precio) AS ganancia
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
        WHERE t.estado = 'completado' AND DATE(t.fecha_hora_inicio) = ?
        GROUP BY s.id, s.nombre
        ORDER BY cantidad DESC, ganancia DESC`,
      [fecha],
    )
    return rows.map(aServicio)
  }
}
