/** Lo que ENTRA por HTTP a las rutas de clientas, validado con zod. */
import { z } from "zod"

export const idParam = z.coerce.number().int().positive()

export const busqueda = z.object({ q: z.string().trim().max(100).optional() })

const cumple = z.object({ dia: z.number().int().min(1).max(31), mes: z.number().int().min(1).max(12) })

const datosCliente = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido: z.string().trim().max(100).nullable(),
  telefono: z.string().trim().min(6).max(30),
  email: z.email().max(150).nullable(),
  // Notas internas de la dueña: la clienta no las ve.
  notas: z.string().trim().max(2000).nullable(),
  // Solo día y mes. null = no se sabe. Que el día exista lo valida el dominio.
  cumple: cumple.nullable(),
})

export const nuevaCliente = datosCliente.partial().required({ nombre: true, telefono: true })
export const cambiosCliente = datosCliente.partial()

export const unir = z.object({
  otraId: z.number().int().positive(),
  telefonoDe: z.enum(["esta", "otra"]).default("esta"),
})
