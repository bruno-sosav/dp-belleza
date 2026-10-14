import mysql from "mysql2/promise"
import { config } from "./config.js"

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  charset: "utf8mb4",
  // DECIMAL llega como number en vez de string (los precios entran sin problema en un double)
  decimalNumbers: true,
  // Los DATETIME llegan como string "YYYY-MM-DD HH:MM:SS" y NO como Date.
  //
  // Con `dateStrings: false` + `timezone: "Z"`, mysql2 interpreta el DATETIME
  // como UTC y lo pasa a hora local: un turno guardado a las 10:00 se lee como
  // 07:00 en Argentina. Medido contra esta misma base. Para `pedidos.created_at`
  // casi no se nota, pero en la turnera la clienta reserva a las 10 y el panel
  // le muestra 07:00.
  //
  // Dejándolos como string, la hora que se guarda es la que se lee. Las cuentas
  // de la agenda se hacen en minutos desde medianoche (src/turnera/tiempo.ts).
  dateStrings: true,
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
