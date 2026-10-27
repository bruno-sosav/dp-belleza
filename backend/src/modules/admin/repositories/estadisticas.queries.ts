/** Lecturas agregadas (GROUP BY) de turnos, servicios y pedidos. Nunca escriben. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import { ESTADOS_DE_VENTA, type ServicioHecho } from "../models/estadisticas.model.js"
import type { ConsultasDeEstadisticas } from "../models/admin.ports.js"

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

  async ventasPorDia(desde: string, hasta: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT DATE(created_at) AS fecha, SUM(total) AS ventas, COUNT(*) AS pedidos
         FROM pedidos
        WHERE estado IN (?) AND created_at >= ? AND created_at < ?
        GROUP BY fecha`,
      [ESTADOS_DE_VENTA, desde, hasta],
    )
    return rows.map((r) => ({ fecha: String(r.fecha), ventas: Number(r.ventas), pedidos: Number(r.pedidos) }))
  }

  async productosVendidos(desde: string, hasta: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT pr.id, pr.nombre, pr.activo, SUM(i.cantidad) AS cantidad, SUM(i.subtotal) AS ganancia
         FROM pedido_items i
         JOIN pedidos p    ON p.id = i.pedido_id
         JOIN productos pr ON pr.id = i.producto_id
        WHERE p.estado IN (?) AND p.created_at >= ? AND p.created_at < ?
        GROUP BY pr.id, pr.nombre, pr.activo
        ORDER BY cantidad DESC, ganancia DESC`,
      [ESTADOS_DE_VENTA, desde, hasta],
    )
    return rows.map((r) => ({
      id: r.id as number,
      nombre: r.nombre as string,
      cantidad: Number(r.cantidad),
      ganancia: Number(r.ganancia),
      activo: Boolean(r.activo),
    }))
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
