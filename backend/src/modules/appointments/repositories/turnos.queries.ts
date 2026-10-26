/** Lecturas de turnos con su clienta y servicio en una sola consulta. Lo cobrado lo da payments. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { EstadoTurno } from "../models/estados.model.js"
import type { CajaDeTurnos, ConsultasDeTurnos, TurnoDeLaClienta, TurnoDelPanel } from "../models/turnos.ports.js"
import { aTurno, COLUMNAS_TURNO } from "./turno.repository.js"

const SELECT_PANEL = `
  SELECT ${COLUMNAS_TURNO},
         s.nombre AS servicio_nombre, s.duracion_min,
         c.nombre AS c_nombre, c.apellido AS c_apellido, c.telefono AS c_telefono
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes  c ON c.id = t.cliente_id`

const aDelPanel = (r: RowDataPacket, cobrado: Map<number, number>): TurnoDelPanel => ({
  ...aTurno(r),
  servicio: { id: r.servicio_id, nombre: r.servicio_nombre, duracionMin: r.duracion_min },
  cliente: { id: r.cliente_id, nombre: r.c_nombre, apellido: r.c_apellido, telefono: r.c_telefono },
  cobrado: cobrado.get(r.id) ?? 0,
})

const SELECT_CLIENTA = `
  SELECT ${COLUMNAS_TURNO}, t.sena_vence_at,
         s.nombre AS servicio_nombre, s.duracion_min, s.profesional,
         c.nombre AS c_nombre, c.apellido AS c_apellido, c.telefono AS c_telefono, c.email AS c_email
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes  c ON c.id = t.cliente_id`

const aDeLaClienta = (r: RowDataPacket): TurnoDeLaClienta => ({
  ...aTurno(r),
  servicio: { id: r.servicio_id, nombre: r.servicio_nombre, duracionMin: r.duracion_min, profesional: r.profesional },
  cliente: { nombre: r.c_nombre, apellido: r.c_apellido, telefono: r.c_telefono, email: r.c_email },
  senaVenceA: r.sena_vence_at ? String(r.sena_vence_at).slice(0, 16) : null,
})

export class MySqlConsultasDeTurnos implements ConsultasDeTurnos {
  constructor(private caja: Pick<CajaDeTurnos, "cobradoPorTurnos">) {}

  private async conCobrado(rows: RowDataPacket[]) {
    const cobrado = await this.caja.cobradoPorTurnos(rows.map((r) => r.id as number))
    return rows.map((r) => aDelPanel(r, cobrado))
  }

  async delPanel(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`${SELECT_PANEL} WHERE t.id = ?`, [id])
    return (await this.conCobrado(rows))[0] ?? null
  }

  async delPanelEntre(desde: string, hasta: string, estado?: EstadoTurno) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `${SELECT_PANEL}
        WHERE t.fecha_hora_inicio >= ? AND t.fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY) ${estado ? "AND t.estado = ?" : ""}
        ORDER BY t.fecha_hora_inicio, t.id LIMIT 1000`,
      estado ? [desde, hasta, estado] : [desde, hasta],
    )
    return this.conCobrado(rows)
  }

  async porTokenPublico(token: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`${SELECT_CLIENTA} WHERE t.token_publico = ?`, [token])
    return rows[0] ? aDeLaClienta(rows[0]) : null
  }

  async porTokenDeSena(token: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`${SELECT_CLIENTA} WHERE t.sena_token = ?`, [token])
    return rows[0] ? aDeLaClienta(rows[0]) : null
  }

  async deLaClienta(id: number, telefono: string, tx?: Transaccion, { bloquear = false } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `${SELECT_CLIENTA} WHERE t.id = ? AND c.telefono = ? ${bloquear ? "FOR UPDATE" : ""}`,
      [id, telefono],
    )
    return rows[0] ? aDeLaClienta(rows[0]) : null
  }
}
