/** Lo que ocupa la agenda: los turnos tomados (tabla `turnos`, de este módulo). */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import { aMinutos } from "../../../core/tiempo.js"
import type { Transaccion } from "../../../core/transaccion.js"
import type { OcupacionDeAgenda } from "../domain/agenda.ports.js"
import { ESTADOS_OCUPAN } from "../domain/estados.js"
import { SQL_SENA_NO_VENCIDA } from "./sqlOcupacion.js"

export class MySqlOcupacionDeAgenda implements OcupacionDeAgenda {
  async turnosDelDia(fecha: string, { tx, bloquear = false, excluirTurnoId = 0 }: { tx?: Transaccion; bloquear?: boolean; excluirTurnoId?: number } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT fecha_hora_inicio, fecha_hora_fin FROM turnos
        WHERE DATE(fecha_hora_inicio) = ? AND estado IN (?) AND ${SQL_SENA_NO_VENCIDA} AND id <> ?
        ORDER BY fecha_hora_inicio ${bloquear ? "FOR UPDATE" : ""}`,
      [fecha, ESTADOS_OCUPAN, excluirTurnoId],
    )
    return rows.map((r) => ({ desde: aMinutos(String(r.fecha_hora_inicio).slice(11, 16)), hasta: aMinutos(String(r.fecha_hora_fin).slice(11, 16)) }))
  }

  async pedidosFuturos(ahora: string, rango?: { desde: string; hasta: string }) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT t.id, t.fecha_hora_inicio, t.fecha_hora_fin, s.nombre AS servicio, c.nombre, c.apellido, c.telefono
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
         JOIN clientes c  ON c.id = t.cliente_id
        WHERE t.estado IN ('reservado', 'confirmado') AND t.fecha_hora_inicio >= ?
          ${rango ? "AND t.fecha_hora_inicio < ? AND t.fecha_hora_fin > ?" : ""}
        ORDER BY t.fecha_hora_inicio`,
      rango ? [ahora, rango.hasta, rango.desde] : [ahora],
    )
    return rows.map((r) => ({
      id: r.id as number,
      fecha: String(r.fecha_hora_inicio).slice(0, 10),
      horaInicio: String(r.fecha_hora_inicio).slice(11, 16),
      horaFin: String(r.fecha_hora_fin).slice(11, 16),
      servicio: r.servicio as string,
      cliente: { nombre: r.nombre as string, apellido: r.apellido as string | null, telefono: r.telefono as string },
    }))
  }
}
