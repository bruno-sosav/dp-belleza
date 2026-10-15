import { z } from "zod"

// Fecha "YYYY-MM-DD" que ademas exista de verdad: el regex solo no alcanza,
// acepta 2026-02-31.
export const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que venir como YYYY-MM-DD")
  .refine((f) => {
    const [y, m, d] = f.split("-").map(Number)
    const probe = new Date(y, m - 1, d)
    return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d
  }, "Esa fecha no existe")

const horaHM = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "La hora tiene que venir como HH:MM en 24hs")

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
  }),
})

export type NuevoTurno = z.infer<typeof nuevoTurno>
