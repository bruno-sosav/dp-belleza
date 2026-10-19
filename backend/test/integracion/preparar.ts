/**
 * Preparación global de los tests de integración (vitest globalSetup).
 *
 * Los tests reservan en 2030 para no pisar datos reales, pero la regla de la
 * web "hasta N días para adelante" (Turnos → Reglas) no lo permitiría. Mientras
 * corren, el máximo se estira; al terminar, queda como estaba.
 */
import { pool } from "../../src/core/database/conexion.js"

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
