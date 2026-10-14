import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { config } from "../config.js"
import { HttpError } from "../errors.js"

export type UsuarioToken = { id: number; nombre: string; rol: "admin" | "empleado" }

declare module "express-serve-static-core" {
  interface Request {
    usuario?: UsuarioToken
  }
}

export function firmarToken(usuario: UsuarioToken): string {
  return jwt.sign(usuario, config.jwtSecret, { expiresIn: "8h" })
}

// Exige un token válido en el header `Authorization: Bearer <token>`.
export const requiereLogin: RequestHandler = (req, _res, next) => {
  const [tipo, token] = req.headers.authorization?.split(" ") ?? []
  if (tipo !== "Bearer" || !token) throw new HttpError(401, "Falta iniciar sesión")
  try {
    const { id, nombre, rol } = jwt.verify(token, config.jwtSecret) as UsuarioToken
    req.usuario = { id, nombre, rol }
  } catch {
    throw new HttpError(401, "Sesión inválida o vencida")
  }
  next()
}
