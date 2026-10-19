import type { Pool, PoolConnection } from "mysql2/promise"
import type { Transaccion, UnidadDeTrabajo } from "../transaccion.js"
import { enTransaccion, pool } from "./conexion.js"

/** La implementación de MySQL del puerto UnidadDeTrabajo. */
export const unidadDeTrabajoMySql: UnidadDeTrabajo = {
  ejecutar: (trabajo) => enTransaccion((conn) => trabajo(conn as unknown as Transaccion)),
}

/**
 * Para los repositorios MySQL: la conexión de la transacción en curso, o el
 * pool si el caso de uso no abrió una.
 */
export function ejecutor(tx?: Transaccion): Pool | PoolConnection {
  return tx ? (tx as unknown as PoolConnection) : pool
}
