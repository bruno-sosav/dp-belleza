/**
 * Conexión a MySQL. UNA sola para toda la app: los módulos turnera, ecommerce y
 * admin usan este mismo pool.
 */
import mysql from "mysql2/promise"
import { config } from "./config.ts"

export const db = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  // Las fechas se manejan como string: así un DATETIME de MySQL no pasa por el
  // Date de JavaScript, que le aplicaría la zona horaria del servidor y correría
  // los turnos de hora.
  dateStrings: true,
  timezone: "local",
})

/** Corre una función dentro de una transacción. Si lanza, hace rollback. */
export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export async function checkConnection() {
  const conn = await db.getConnection()
  try {
    await conn.query("SELECT 1")
  } finally {
    conn.release()
  }
}
