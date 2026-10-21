// Crea (o actualiza la clave de) un usuario del panel de administración.
// Uso: npm run crear-admin -- "Nombre" email@ejemplo.com "clave-segura"
import { pool } from "../src/core/database/conexion.database.js"
import { auth } from "../src/modules/auth/auth.module.js"

const [nombre, email, password] = process.argv.slice(2)
if (!nombre || !email || !password) {
  console.error('Uso: npm run crear-admin -- "Nombre" email@ejemplo.com "clave-segura"')
  process.exit(1)
}

try {
  // Misma regla de contraseña que "Tu cuenta" (al menos 8 caracteres, sin espacios en las puntas).
  await auth.guardarAdmin(nombre, email, password)
  console.log(`Usuario ${email} listo`)
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await pool.end()
}
