import type { Pool, PoolConnection } from "mysql2/promise"
import type { Transaccion, UnidadDeTrabajo } from "../transaccion.port.js"
import { enTransaccion, pool } from "./conexion.database.js"

/** La implementación de MySQL del puerto UnidadDeTrabajo. */
export const unidadDeTrabajoMySql: UnidadDeTrabajo = {
  ejecutar: (trabajo) => enTransaccion((conn) => trabajo(conn as unknown as Transaccion)),
}

/** Envuelve una conexión propia como Transaccion, para código que todavía no está en modules/. */
export function comoTransaccion(conn: PoolConnection): Transaccion {
  return conn as unknown as Transaccion
}

/** La conexión de la transacción en curso, o el pool si no hay una. */
export function ejecutor(tx?: Transaccion): Pool | PoolConnection {
  return tx ? (tx as unknown as PoolConnection) : pool
}
