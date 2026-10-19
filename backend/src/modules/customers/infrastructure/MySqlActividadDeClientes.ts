/**
 * TRANSITORIO. Implementa el puerto ActividadDeClientes leyendo las tablas de
 * turnos y de la tienda. Esas tablas no son de este módulo: cuando se muden
 * appointments/ y orders/, cada uno va a proveer su parte de este puerto y este
 * archivo desaparece. Mientras tanto, es el único lugar de clientas que las lee.
 */
import type { RowDataPacket } from "mysql2"
import type { Transaccion } from "../../../core/transaccion.js"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { Actividad } from "../domain/cliente.js"
import type { ActividadDeClientes } from "../domain/ports.js"

export class MySqlActividadDeClientes implements ActividadDeClientes {
  /** Plata: solo turnos completados y pedidos que no estén cancelados. */
  async resumenes(ids: number[]) {
    const resultado = new Map<number, Actividad>()
    if (!ids.length) return resultado
    const [turnos] = await ejecutor().query<RowDataPacket[]>(
      `SELECT cliente_id,
              SUM(estado = 'completado')                                      AS visitas,
              SUM(estado = 'ausente')                                         AS ausencias,
              SUM(CASE WHEN estado = 'completado' THEN precio ELSE 0 END)     AS gastado,
              MAX(CASE WHEN estado = 'completado' THEN fecha_hora_inicio END) AS ultima_visita,
              MIN(CASE WHEN estado IN ('reservado', 'confirmado') AND fecha_hora_inicio > NOW()
                       THEN fecha_hora_inicio END)                            AS proximo_turno
         FROM turnos WHERE cliente_id IN (?) GROUP BY cliente_id`,
      [ids],
    )
    const [pedidos] = await ejecutor().query<RowDataPacket[]>(
      `SELECT cliente_id, COUNT(*) AS compras, SUM(total) AS gastado
         FROM pedidos WHERE cliente_id IN (?) AND estado <> 'cancelado' GROUP BY cliente_id`,
      [ids],
    )
    const t = new Map(turnos.map((r) => [r.cliente_id as number, r]))
    const p = new Map(pedidos.map((r) => [r.cliente_id as number, r]))
    for (const id of ids) {
      const rt = t.get(id)
      const rp = p.get(id)
      const gastadoTurnos = Number(rt?.gastado ?? 0)
      const gastadoTienda = Number(rp?.gastado ?? 0)
      resultado.set(id, {
        visitas: Number(rt?.visitas ?? 0),
        ausencias: Number(rt?.ausencias ?? 0),
        compras: Number(rp?.compras ?? 0),
        gastado: { turnos: gastadoTurnos, tienda: gastadoTienda, total: gastadoTurnos + gastadoTienda },
        ultimaVisita: rt?.ultima_visita ? String(rt.ultima_visita).slice(0, 10) : null,
        proximoTurno: rt?.proximo_turno ? String(rt.proximo_turno).slice(0, 16) : null,
      })
    }
    return resultado
  }

  async historial(id: number) {
    const [turnos] = await ejecutor().query<RowDataPacket[]>(
      `SELECT t.id, t.estado, t.precio, t.fecha_hora_inicio, s.nombre AS servicio
         FROM turnos t JOIN servicios s ON s.id = t.servicio_id
        WHERE t.cliente_id = ? ORDER BY t.fecha_hora_inicio DESC LIMIT 200`,
      [id],
    )
    const [pedidos] = await ejecutor().query<RowDataPacket[]>(
      `SELECT p.id, p.estado, p.total, p.created_at,
              (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
         FROM pedidos p WHERE p.cliente_id = ? ORDER BY p.created_at DESC LIMIT 200`,
      [id],
    )
    return {
      turnos: turnos.map((t) => ({
        id: t.id as number,
        estado: t.estado as string,
        fecha: String(t.fecha_hora_inicio).slice(0, 10),
        horaInicio: String(t.fecha_hora_inicio).slice(11, 16),
        servicio: t.servicio as string,
        precio: Number(t.precio),
      })),
      pedidos: pedidos.map((p) => ({
        id: p.id as number,
        estado: p.estado as string,
        total: Number(p.total),
        unidades: Number(p.unidades),
        fecha: String(p.created_at).slice(0, 10),
      })),
    }
  }

  async uso(id: number, tx?: Transaccion) {
    const [[r]] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM turnos  WHERE cliente_id = ?) AS turnos,
              (SELECT COUNT(*) FROM pedidos WHERE cliente_id = ?) AS pedidos`,
      [id, id],
    )
    return { turnos: Number(r.turnos), pedidos: Number(r.pedidos) }
  }
}
