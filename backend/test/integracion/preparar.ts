/** globalSetup: estira el máximo de días para reservar (los tests usan 2030) y al final lo restaura. */
import { pool } from "../../src/core/database/conexion.database.js"

const CLAVE = "reserva_anticipacion_max_dias"
let original: string | null = null

export async function setup() {
  const [rows] = await pool.query("SELECT valor FROM configuracion WHERE clave = ?", [CLAVE])
  original = (rows as { valor: string }[])[0]?.valor ?? null
  await pool.query("UPDATE configuracion SET valor = '4000' WHERE clave = ?", [CLAVE])
}

export async function teardown() {
  if (original !== null) await pool.query("UPDATE configuracion SET valor = ? WHERE clave = ?", [original, CLAVE])
  await pool.end()
}
