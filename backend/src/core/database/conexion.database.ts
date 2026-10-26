import mysql from "mysql2/promise"
import { config } from "../app.config.js"

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  charset: "utf8mb4",
  // DECIMAL llega como number en vez de string (los precios entran sin problema en un double)
  decimalNumbers: true,
  // DATETIME como string: con Date, mysql2 lo toma como UTC y un turno de las 10:00 se lee 07:00.
  dateStrings: true,
})

/** Misma zona que Node en cada conexión. Como desfasaje ("-03:00"): muchos MySQL no tienen cargadas las zonas por nombre. */
export function desfasajeMySQL(fecha = new Date()): string {
  const minutos = -fecha.getTimezoneOffset()
  const signo = minutos >= 0 ? "+" : "-"
  const abs = Math.abs(minutos)
  return `${signo}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
}

pool.pool.on("connection", (conexion) => {
  conexion.query(`SET time_zone = '${desfasajeMySQL()}'`)
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
