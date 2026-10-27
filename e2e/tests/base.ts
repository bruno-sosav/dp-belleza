import { config } from "dotenv"
import mysql from "mysql2/promise"

export const WEB = "http://localhost:5173"
export const PANEL = "http://localhost:5174"

// La misma usuaria que usan los tests de integración (en el CI la crea el workflow).
export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@dpbelleza.com"
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "dp-belleza-2026"

// Clienta de prueba. Teléfonos 223 555 98xx: ni los seeds ni los tests de integración (99xx) los usan.
export const CLIENTA = { nombre: "Clienta E2E Prueba", telefono: "223 555-9801" }
const TELEFONO_GUARDADO = "54922355598%"

config({ path: new URL("../../backend/.env.local", import.meta.url).pathname, quiet: true })

/** Borra todo lo que crearon los tests (clientas 223 555 98xx y sus turnos). */
export async function limpiar() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  try {
    const [filas] = await db.query<mysql.RowDataPacket[]>("SELECT id FROM clientes WHERE telefono LIKE ?", [TELEFONO_GUARDADO])
    const ids = filas.map((f) => f.id)
    if (!ids.length) return
    await db.query("DELETE FROM cobros WHERE cliente_id IN (?) OR turno_id IN (SELECT id FROM turnos WHERE cliente_id IN (?))", [ids, ids])
    await db.query("DELETE FROM recordatorios WHERE cliente_id IN (?) OR turno_id IN (SELECT id FROM turnos WHERE cliente_id IN (?))", [ids, ids])
    await db.query("DELETE FROM turnos WHERE cliente_id IN (?)", [ids])
    await db.query("DELETE FROM clientes WHERE id IN (?)", [ids])
  } finally {
    await db.end()
  }
}
