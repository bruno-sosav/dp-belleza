import { Router } from "express"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../../core/database/conexion.database.js"
import { HttpError } from "../../core/negocio.error.js"
import { firmarToken, requiereLogin } from "../../core/http/sesion.middleware.js"
import { limitarPorIp } from "../../core/http/limitarPorIp.middleware.js"

// Login del panel, montado en /api/auth.
export const auth = Router()

const credenciales = z.object({
  email: z.email(),
  password: z.string().min(1),
})

// Sin límite, se podrían probar contraseñas sin parar. 10 intentos cada 15
// minutos alcanzan para equivocarse varias veces escribiendo la propia.
const limiteLogin = limitarPorIp({
  maximo: 10,
  ventanaMs: 15 * 60_000,
  mensaje: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
})

auth.post("/login", limiteLogin, async (req, res) => {
  const { email, password } = credenciales.parse(req.body)
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre, rol, password_hash FROM usuarios WHERE email = ? AND activo = 1",
    [email],
  )
  const usuario = rows[0]
  // Mismo mensaje si no existe el email o si la clave está mal, para no revelar qué emails hay.
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    throw new HttpError(401, "Email o contraseña incorrectos")
  }
  const datos = { id: usuario.id as number, nombre: usuario.nombre as string, rol: usuario.rol }
  res.json({ token: firmarToken(datos), usuario: datos })
})

auth.get("/yo", requiereLogin, (req, res) => {
  res.json(req.usuario)
})
