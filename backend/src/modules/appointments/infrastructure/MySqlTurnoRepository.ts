/** Turnos en MySQL: el ÚNICO lugar que escribe la tabla `turnos`. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { Transaccion } from "../../../core/transaccion.js"
import type { CambiosTurno, NuevoTurno, TurnoRepository } from "../domain/turnos.ports.js"
import type { Turno } from "../domain/turno.js"
import { SQL_SENA_NO_VENCIDA } from "./sqlOcupacion.js"

export const COLUMNAS_TURNO = `t.id, t.cliente_id, t.servicio_id, t.fecha_hora_inicio, t.fecha_hora_fin, t.estado, t.cancelado_por,
       t.precio, t.notas, t.sena_monto, t.sena_estado, t.sena_token`

export function aTurno(r: RowDataPacket): Turno {
  const inicio = String(r.fecha_hora_inicio)
  return {
    id: r.id,
    clienteId: r.cliente_id,
    servicioId: r.servicio_id,
    // "2026-10-20 14:30:00" → fecha y hora por separado, cortando el string
    // (sin pasar por Date, ver core/database/conexion.ts).
    fecha: inicio.slice(0, 10),
    horaInicio: inicio.slice(11, 16),
    horaFin: String(r.fecha_hora_fin).slice(11, 16),
    estado: r.estado,
    canceladoPor: r.cancelado_por ?? null,
    precio: Number(r.precio),
    notas: r.notas,
    sena: r.sena_estado ? { monto: Number(r.sena_monto), estado: r.sena_estado, token: r.sena_token } : null,
  }
}

export class MySqlTurnoRepository implements TurnoRepository {
  async porId(id: number, tx?: Transaccion, { bloquear = false } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(`SELECT ${COLUMNAS_TURNO} FROM turnos t WHERE t.id = ? ${bloquear ? "FOR UPDATE" : ""}`, [id])
    return rows[0] ? aTurno(rows[0]) : null
  }

  async porTokenDeSena(token: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT ${COLUMNAS_TURNO}, (t.sena_vence_at < NOW()) AS vencida FROM turnos t WHERE t.sena_token = ?`,
      [token],
    )
    return rows[0] ? { ...aTurno(rows[0]), senaVencida: Boolean(rows[0].vencida) } : null
  }

  async crear(d: NuevoTurno, tx: Transaccion) {
    const [r] = await ejecutor(tx).query<ResultSetHeader>(
      `INSERT INTO turnos
           (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, estado, precio, notas,
            sena_monto, sena_estado, sena_vence_at, sena_token, token_publico)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${d.sena ? "NOW() + INTERVAL ? MINUTE" : "NULL"}, ?, ?)`,
      [
        d.clienteId,
        d.servicioId,
        `${d.fecha} ${d.horaInicio}:00`,
        `${d.fecha} ${d.horaFin}:00`,
        d.estado,
        d.precio,
        d.notas,
        d.sena?.monto ?? null,
        d.sena ? "pendiente" : null,
        ...(d.sena ? [d.sena.venceEnMinutos] : []),
        d.sena?.token ?? null,
        d.tokenPublico,
      ],
    )
    return r.insertId
  }

  async actualizar(id: number, c: CambiosTurno, tx?: Transaccion) {
    const columnas: Record<string, unknown> = {}
    const extra: string[] = []
    if (c.servicioId !== undefined) columnas.servicio_id = c.servicioId
    if (c.precio !== undefined) columnas.precio = c.precio
    if (c.notas !== undefined) columnas.notas = c.notas
    if (c.estado !== undefined) columnas.estado = c.estado
    if (c.senaEstado !== undefined) columnas.sena_estado = c.senaEstado
    if (c.senaPagoId !== undefined) columnas.sena_pago_id = c.senaPagoId
    if (c.fecha !== undefined && c.horaInicio !== undefined) columnas.fecha_hora_inicio = `${c.fecha} ${c.horaInicio}:00`
    if (c.fecha !== undefined && c.horaFin !== undefined) columnas.fecha_hora_fin = `${c.fecha} ${c.horaFin}:00`
    if (c.canceladoPor !== undefined) {
      columnas.cancelado_por = c.canceladoPor
      // Cuándo se canceló: se anota al cancelar y se borra si el turno se recupera.
      extra.push(c.canceladoPor ? "cancelado_at = NOW()" : "cancelado_at = NULL")
    }
    if (!Object.keys(columnas).length && !extra.length) return
    await ejecutor(tx).query(`UPDATE turnos SET ? ${extra.length ? `, ${extra.join(", ")}` : ""} WHERE id = ?`, [columnas, id])
  }

  async pedidosFuturosDeCliente(clienteId: number, tx: Transaccion) {
    const [[r]] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM turnos
        WHERE cliente_id = ? AND estado IN ('reservado', 'confirmado') AND fecha_hora_inicio > NOW() AND ${SQL_SENA_NO_VENCIDA}`,
      [clienteId],
    )
    return Number(r.n)
  }

  async vencerSenas() {
    const [r] = await ejecutor().query<ResultSetHeader>(
      `UPDATE turnos SET estado = 'cancelado', cancelado_por = 'sistema', cancelado_at = NOW(), sena_estado = 'vencida'
        WHERE estado = 'reservado' AND sena_estado = 'pendiente' AND sena_vence_at < NOW()`,
    )
    return r.affectedRows
  }
}
