/** Cada pago que avisó Mercado Pago, con lo que mandó tal cual (tabla `mercadopago_pagos`). */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { PagoRecibido } from "../domain/mercadoPago.js"
import type { PagosRecibidosRepository } from "../domain/payments.ports.js"

export class MySqlPagosRecibidos implements PagosRecibidosRepository {
  async guardar(p: PagoRecibido, datos: unknown) {
    await ejecutor().query(
      `INSERT INTO mercadopago_pagos (pago_id, estado, estado_detalle, monto, referencia_externa, datos)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE estado = VALUES(estado), estado_detalle = VALUES(estado_detalle),
         monto = VALUES(monto), referencia_externa = VALUES(referencia_externa), datos = VALUES(datos)`,
      [p.id, p.estado, p.detalle, p.monto, p.referencia, JSON.stringify(datos)],
    )
  }

  async ultimoEstado(referencia: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT estado FROM mercadopago_pagos WHERE referencia_externa = ? ORDER BY updated_at DESC LIMIT 1",
      [referencia],
    )
    return (rows[0]?.estado as string | undefined) ?? null
  }
}
