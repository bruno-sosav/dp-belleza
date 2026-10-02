import mysql from "mysql2/promise"
import { config } from "./config.js"

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  charset: "utf8mb4",
  // DECIMAL llega como number en vez de string (los precios entran sin problema en un double)
  decimalNumbers: true,
  dateStrings: false,
  timezone: "Z",
})

// Corre `fn` dentro de una transacción: commit si termina bien, rollback si tira error.
export async function enTransaccion<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const resultado = await fn(conn)
    await conn.commit()
    return resultado
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
