/** Lo que ENTRA por HTTP a la agenda, validado con zod. */
import { z } from "zod"
import { fechaISO, horaHM } from "../../../../core/validacion.schema.js"

export const idParam = z.coerce.number().int().positive()

export const consultaDisponibilidad = z.object({
  servicioId: z.coerce.number().int().positive(),
  fecha: fechaISO,
})

export const consultaDisponibilidadPanel = consultaDisponibilidad.extend({
  excluir: z.coerce.number().int().positive().optional(),
})

const franja = z.object({ diaSemana: z.number().int().min(1).max(7), desde: horaHM, hasta: horaHM })
export const nuevoHorario = z.object({ franjas: z.array(franja).max(50) })

export const rangoBloqueos = z.object({ desde: fechaISO.optional(), hasta: fechaISO.optional() })

const fechaHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/, "Tiene que venir como YYYY-MM-DD HH:MM")
  .refine((v) => fechaISO.safeParse(v.slice(0, 10)).success, "Esa fecha no existe")

export const nuevoBloqueo = z.object({ desde: fechaHora, hasta: fechaHora, motivo: z.string().trim().max(255).optional() })
