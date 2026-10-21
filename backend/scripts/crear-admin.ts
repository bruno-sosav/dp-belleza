// Crea (o actualiza la clave de) un usuario del panel de administración.
// Uso: npm run crear-admin -- "Nombre" email@ejemplo.com "clave-segura"
import bcrypt from "bcryptjs"
import { pool } from "../src/core/database/conexion.database.js"

const [nombre, email, password] = process.argv.slice(2)
if (!nombre || !email || !password) {
  console.error('Uso: npm run crear-admin -- "Nombre" email@ejemplo.com "clave-segura"')
  process.exit(1)
}
if (password.length < 8) {
  console.error("La clave tiene que tener al menos 8 caracteres")
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
await pool.query(
  `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, 'admin')
   ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), password_hash = VALUES(password_hash), activo = 1`,
  [nombre, email, hash],
)
console.log(`Usuario ${email} listo`)
await pool.end()
