/**
 * Vistas de lectura de recordatorios: leen turnos, servicios y clientas (de
 * otros módulos) para calcular a quién le toca cada aviso, en una consulta.
 * Nunca escriben esas tablas.
 */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { ConsultasDeRecordatorios, TurnoCandidato } from "../models/recordatorios.ports.js"

const SELECT_TURNO = `
  SELECT t.id, t.fecha_hora_inicio, s.nombre AS servicio,
         c.id AS cliente_id, c.nombre, c.apellido, c.telefono
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes c  ON c.id = t.cliente_id`

const aCandidato = (r: RowDataPacket): TurnoCandidato => ({
  id: r.id,
  inicio: String(r.fecha_hora_inicio),
  servicio: r.servicio,
  cliente: { id: r.cliente_id, nombre: r.nombre, apellido: r.apellido, telefono: r.telefono },
})

export class MySqlConsultasDeRecordatorios implements ConsultasDeRecordatorios {
  async turnosPedidos(ahora: string, horas: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `${SELECT_TURNO}
        WHERE t.estado IN ('reservado', 'confirmado')
          -- Con la seña sin pagar todavía no es un turno firme: puede liberarse
          -- en minutos. Se recuerda recién cuando la pague.
          AND (t.sena_estado IS NULL OR t.sena_estado = 'pagada')
          AND t.fecha_hora_inicio > ?
          AND t.fecha_hora_inicio <= DATE_ADD(?, INTERVAL ? HOUR)
        ORDER BY t.fecha_hora_inicio`,
      [ahora, ahora, horas],
    )
    return rows.map(aCandidato)
  }

  async ultimasVisitas(p: { tipoId: number; servicioId: number | null; hoy: string; ahora: string; dias: number; ventana: number }) {
    // El filtro de servicio va dos veces: en la visita y en "su última visita".
    const porServicio = p.servicioId ? [p.servicioId, p.servicioId] : []
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `${SELECT_TURNO}
        WHERE t.estado = 'completado'
          ${p.servicioId ? "AND t.servicio_id = ?" : ""}
          -- la última visita de la clienta (de ese servicio, si filtra)
          AND t.fecha_hora_inicio = (
                SELECT MAX(t2.fecha_hora_inicio) FROM turnos t2
                 WHERE t2.cliente_id = t.cliente_id AND t2.estado = 'completado'
                   ${p.servicioId ? "AND t2.servicio_id = ?" : ""})
          AND DATE(t.fecha_hora_inicio) <= DATE_SUB(?, INTERVAL ? DAY)
          AND DATE(t.fecha_hora_inicio) >  DATE_SUB(?, INTERVAL ? DAY)
          -- sin otro turno pedido
          AND NOT EXISTS (SELECT 1 FROM turnos t3
                           WHERE t3.cliente_id = t.cliente_id
                             AND t3.estado IN ('reservado', 'confirmado')
                             AND t3.fecha_hora_inicio > ?)
          AND NOT EXISTS (SELECT 1 FROM recordatorios r WHERE r.turno_id = t.id AND r.tipo_id = ?)
        ORDER BY t.fecha_hora_inicio`,
      [...porServicio, p.hoy, p.dias, p.hoy, p.dias + p.ventana, p.ahora, p.tipoId],
    )
    return rows.map(aCandidato)
  }

  async clientasConCumple() {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT id, nombre, apellido, telefono, cumple_dia, cumple_mes FROM clientes WHERE cumple_dia IS NOT NULL",
    )
    return rows.map((r) => ({ id: r.id, nombre: r.nombre, apellido: r.apellido, telefono: r.telefono, cumpleDia: r.cumple_dia, cumpleMes: r.cumple_mes }))
  }

  async hechosDesde(fecha: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT r.id, r.estado, tr.nombre AS tipo, tr.momento,
              COALESCE(ct.nombre, cc.nombre) AS nombre, COALESCE(ct.apellido, cc.apellido) AS apellido
         FROM recordatorios r
         JOIN tipos_recordatorio tr ON tr.id = r.tipo_id
         LEFT JOIN turnos t    ON t.id = r.turno_id
         LEFT JOIN clientes ct ON ct.id = t.cliente_id
         LEFT JOIN clientes cc ON cc.id = r.cliente_id
        WHERE r.enviado_at >= ?
        ORDER BY r.enviado_at DESC`,
      [fecha],
    )
    return rows.map((r) => ({ id: r.id, estado: r.estado, tipo: r.tipo, momento: r.momento, cliente: { nombre: r.nombre, apellido: r.apellido } }))
  }
}
