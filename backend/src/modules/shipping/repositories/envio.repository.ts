/** `envios` en MySQL: el ÚNICO lugar que escribe la tabla. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Envio } from "../models/envio.model.js"
import type { EnvioRepository } from "../models/envios.ports.js"

export const aEnvio = (r: RowDataPacket): Envio => ({
  pedidoId: r.pedido_id,
  calle: r.calle,
  ciudad: r.ciudad,
  provincia: r.provincia,
  codigoPostal: r.codigo_postal,
  costo: Number(r.costo),
  plazoDias: r.plazo_dias ?? null,
  proveedor: r.proveedor,
  estado: r.estado,
  numeroSeguimiento: r.numero_seguimiento ?? null,
  despachadoAt: r.despachado_at ? String(r.despachado_at).slice(0, 16) : null,
})

export class MySqlEnvioRepository implements EnvioRepository {
  async registrar(e: Omit<Envio, "estado" | "numeroSeguimiento" | "despachadoAt">, tx: Transaccion) {
    await ejecutor(tx).query(
      `INSERT INTO envios (pedido_id, calle, ciudad, provincia, codigo_postal, costo, plazo_dias, proveedor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.pedidoId, e.calle, e.ciudad, e.provincia, e.codigoPostal, e.costo, e.plazoDias, e.proveedor],
    )
  }

  async porPedido(pedidoId: number, tx?: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(`SELECT * FROM envios WHERE pedido_id = ? ${tx ? "FOR UPDATE" : ""}`, [pedidoId])
    return rows[0] ? aEnvio(rows[0]) : null
  }

  async marcarDespachado(pedidoId: number, numero: string) {
    await ejecutor().query("UPDATE envios SET estado = 'despachado', numero_seguimiento = ?, despachado_at = NOW() WHERE pedido_id = ?", [numero, pedidoId])
  }

  async marcarEntregado(pedidoId: number, tx?: Transaccion) {
    await ejecutor(tx).query("UPDATE envios SET estado = 'entregado' WHERE pedido_id = ?", [pedidoId])
  }
}
