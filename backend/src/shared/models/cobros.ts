/**
 * Cobros: la plata que entró a la caja (tabla `cobros`, migración V11).
 *
 * Lo usan el panel (al completar un turno, o anotando a mano) y la seña de
 * Mercado Pago, que entra sola. Va acá, en shared/, porque lo escriben
 * módulos distintos.
 */
import type { PoolConnection, ResultSetHeader } from "mysql2/promise"

export const MEDIOS_PAGO = ["efectivo", "debito", "credito", "transferencia", "mercadopago"] as const
export type MedioPago = (typeof MEDIOS_PAGO)[number]

export const CONCEPTOS_COBRO = ["sena", "turno", "otro"] as const
export type ConceptoCobro = (typeof CONCEPTOS_COBRO)[number]

export type NuevoCobro = {
  monto: number
  medio: MedioPago
  concepto: ConceptoCobro
  turnoId?: number | null
  clienteId?: number | null
  descripcion?: string | null
  /** Solo pagos de Mercado Pago: evita que el mismo pago entre dos veces. */
  mpPagoId?: number | null
}

/**
 * Anota un cobro. Con `mpPagoId` repetido no hace nada (el aviso de Mercado
 * Pago puede llegar dos veces). Devuelve el id, o null si ya estaba.
 */
export async function registrarCobro(conn: PoolConnection, c: NuevoCobro): Promise<number | null> {
  const [r] = await conn.query<ResultSetHeader>(
    `INSERT IGNORE INTO cobros (monto, medio, concepto, turno_id, cliente_id, descripcion, mp_pago_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.monto, c.medio, c.concepto, c.turnoId ?? null, c.clienteId ?? null, c.descripcion ?? null, c.mpPagoId ?? null],
  )
  return r.affectedRows ? r.insertId : null
}
