import { z } from "zod"

import { fechaISO, horaHM } from "../core/validacion.js"

export { fechaISO, horaHM }

export const consultaDisponibilidad = z.object({
  servicioId: z.coerce.number().int().positive(),
  fecha: fechaISO,
})

export const nuevoTurno = z.object({
  servicioId: z.number().int().positive(),
  fecha: fechaISO,
  hora: horaHM,
  contacto: z.object({
    // Mismo minimo que pide el front en isContactComplete()
    nombreCompleto: z.string().trim().min(3).max(200),
    telefono: z.string().trim().min(6).max(30),
    email: z.email().max(150).optional(),
    notas: z.string().trim().max(1000).optional(),
    // Opcional: solo día y mes, para que el local la salude o le mande una promo.
    cumple: z
      .object({ dia: z.number().int().min(1).max(31), mes: z.number().int().min(1).max(12) })
      .refine(({ dia, mes }) => dia <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1], "Ese día no existe en ese mes")
      .optional(),
  }),
})

export type NuevoTurno = z.infer<typeof nuevoTurno>
