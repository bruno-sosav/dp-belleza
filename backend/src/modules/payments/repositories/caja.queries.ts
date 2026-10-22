/**
 * Vistas de lectura de la caja. Juntan los cobros con turnos, servicios y
 * clientas (tablas de otros módulos) solo para MOSTRAR, en una consulta, en
 * vez de un pedido por fila. Nunca escriben esas tablas.
 */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { ConsultasDeCaja } from "../models/pagos.ports.js"
import { aCobro } from "./cobro.repository.js"

const nombre = (r: RowDataPacket) => [r.nombre, r.apellido].filter(Boolean).join(" ")

export class MySqlConsultasDeCaja implements ConsultasDeCaja {
  async delDia(fecha: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT cb.*, s.nombre AS servicio, t.fecha_hora_inicio AS turno_inicio, c.nombre, c.apellido
         FROM cobros cb
         LEFT JOIN turnos t    ON t.id = cb.turno_id
         LEFT JOIN servicios s ON s.id = t.servicio_id
         LEFT JOIN clientes c  ON c.id = cb.cliente_id
        WHERE cb.fecha_hora >= ? AND cb.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY cb.fecha_hora DESC, cb.id DESC`,
      [fecha, fecha],
    )
    return rows.map((r) => ({
      ...aCobro(r),
      turno: r.turno_id ? { id: r.turno_id as number, servicio: r.servicio as string, fecha: String(r.turno_inicio).slice(0, 10), hora: String(r.turno_inicio).slice(11, 16) } : null,
      cliente: r.cliente_id ? { nombre: nombre(r) } : null,
    }))
  }

  async sinCobrar(fecha: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT t.id, t.fecha_hora_inicio, t.precio, s.nombre AS servicio, c.nombre, c.apellido,
              (SELECT COALESCE(SUM(cb.monto), 0) FROM cobros cb WHERE cb.turno_id = t.id) AS cobrado
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
         JOIN clientes c  ON c.id = t.cliente_id
        WHERE t.estado = 'completado'
          AND t.fecha_hora_inicio >= ? AND t.fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY)
       HAVING cobrado < t.precio
        ORDER BY t.fecha_hora_inicio`,
      [fecha, fecha],
    )
    return rows.map((p) => ({
      turnoId: p.id as number,
      hora: String(p.fecha_hora_inicio).slice(11, 16),
      servicio: p.servicio as string,
      cliente: { nombre: nombre(p) },
      precio: Number(p.precio),
      cobrado: Number(p.cobrado),
    }))
  }
}
