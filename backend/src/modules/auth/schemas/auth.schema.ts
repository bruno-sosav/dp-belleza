/** Lo que ENTRA al login y a "Tu cuenta". */
import { z } from "zod"
import { problemaDeContrasena } from "../models/usuario.model.js"

export const credenciales = z.object({
  email: z.email(),
  password: z.string().min(1),
})

/** La regla es del dominio; acá se chequea antes para que el error llegue como los demás de validación. */
export const contrasenaNueva = z.string().superRefine((v, ctx) => {
  const problema = problemaDeContrasena(v)
  if (problema) ctx.addIssue({ code: "custom", message: problema })
})

export const cambiosCuenta = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(150).optional(),
  contrasenaActual: z.string().optional(),
})

export const cambioContrasena = z.object({
  actual: z.string().min(1),
  nueva: contrasenaNueva,
})
