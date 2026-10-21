/** Validaciones de zod que usan varios módulos (fechas y horas de la API). */
import { z } from "zod"

// Fecha "YYYY-MM-DD" que además exista de verdad: el regex solo no alcanza,
// acepta 2026-02-31.
export const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que venir como YYYY-MM-DD")
  .refine((f) => {
    const [y, m, d] = f.split("-").map(Number)
    const probe = new Date(y, m - 1, d)
    return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d
  }, "Esa fecha no existe")

export const horaHM = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "La hora tiene que venir como HH:MM en 24hs")
