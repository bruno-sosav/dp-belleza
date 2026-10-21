import mysql from "mysql2/promise"
import { config } from "../app.config.js"

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
  // de la agenda se hacen en minutos desde medianoche (src/core/tiempo.util.ts).
  dateStrings: true,
})

/**
 * Cada conexión a MySQL usa la misma zona horaria que Node (app.config.ts), así
 * NOW() y la hora de Node dan lo mismo. Va como desfasaje ("-03:00") y no
 * como nombre ("America/…"), porque los nombres necesitan tablas de zonas que
 * muchos MySQL no tienen cargadas. Argentina no tiene horario de verano; si lo
 * volviera a tener, el desfasaje se recalcula en cada conexión nueva.
 */
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
