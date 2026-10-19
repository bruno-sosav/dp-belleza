/**
 * Panel: Ajustes → Tu cuenta. La usuaria del panel cambia su nombre, su email
 * de ingreso y su contraseña.
 *
 * Cambiar el email o la contraseña pide la contraseña actual: si alguien
 * encuentra la sesión abierta en la compu del local, no puede quedarse con la
 * cuenta.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import bcrypt from "bcryptjs"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../core/database/conexion.js"
import { conflicto, HttpError, noEncontrado } from "../core/errores.js"
import { firmarToken } from "../core/http/sesion.js"

export const adminCuenta = Router()

/** Mínimo razonable para una persona que no usa gestor de contraseñas: largo, sin reglas raras. */
export const contrasenaNueva = z
  .string()
  .min(8, "La contraseña nueva tiene que tener al menos 8 caracteres")
  .max(100)
  .refine((v) => v.trim().length === v.length, "La contraseña no puede empezar ni terminar con espacios")

async function usuario(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE id = ? AND activo = 1", [id])
  if (!rows[0]) throw noEncontrado("Usuario")
  return rows[0]
}

async function verificarActual(hash: string, actual: string | undefined) {
  if (!actual || !(await bcrypt.compare(actual, hash))) {
    throw new HttpError(400, "La contraseña actual no es correcta.")
  }
}

/** GET /api/admin/cuenta */
adminCuenta.get("/cuenta", async (req, res) => {
  const u = await usuario(req.usuario!.id)
  res.json({ nombre: u.nombre, email: u.email })
})

/**
 * PATCH /api/admin/cuenta   { "nombre": "Daniela", "email": "...", "contrasenaActual": "..." }
 *
 * Devuelve un token nuevo: el nombre viaja adentro del token y se muestra en
 * el panel ("Sesión de Daniela").
 */
adminCuenta.patch("/cuenta", async (req, res) => {
  const d = z
    .object({
      nombre: z.string().trim().min(1).max(100).optional(),
      email: z.email().max(150).optional(),
      contrasenaActual: z.string().optional(),
    })
    .parse(req.body)
  const u = await usuario(req.usuario!.id)
  const cambiaEmail = d.email !== undefined && d.email.toLowerCase() !== String(u.email).toLowerCase()
  if (cambiaEmail) await verificarActual(u.password_hash, d.contrasenaActual)

  try {
    await pool.query<ResultSetHeader>("UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?", [
      d.nombre ?? u.nombre,
      cambiaEmail ? d.email : u.email,
      u.id,
    ])
  } catch (err) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") throw conflicto("Ese email ya lo usa otra cuenta.")
    throw err
  }
  const datos = { id: u.id as number, nombre: d.nombre ?? (u.nombre as string), rol: u.rol }
  res.json({ usuario: datos, token: firmarToken(datos), email: cambiaEmail ? d.email : u.email })
})

/** POST /api/admin/cuenta/contrasena   { "actual": "...", "nueva": "..." } */
adminCuenta.post("/cuenta/contrasena", async (req, res) => {
  const d = z.object({ actual: z.string().min(1), nueva: contrasenaNueva }).parse(req.body)
  const u = await usuario(req.usuario!.id)
  await verificarActual(u.password_hash, d.actual)
  if (d.actual === d.nueva) throw new HttpError(400, "La contraseña nueva tiene que ser distinta de la actual.")
  await pool.query("UPDATE usuarios SET password_hash = ? WHERE id = ?", [await bcrypt.hash(d.nueva, 12), u.id])
  res.status(204).end()
})
