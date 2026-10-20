/** Lo que ENTRA por HTTP a recordatorios, validado con zod. */
import { z } from "zod"

export const idParam = z.coerce.number().int().positive()

/** El `registro` que vino en el aviso, más el estado. */
export const marca = z.object({
  tipoId: z.number().int().positive(),
  turnoId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive().optional(),
  anio: z.number().int().min(2000).max(2100).optional(),
  estado: z.enum(["enviado", "omitido"]),
})

const comunes = {
  nombre: z.string().trim().min(1).max(100),
  mensaje: z.string().trim().min(10).max(1000),
}
export const datosTipo = z.discriminatedUnion("momento", [
  // Hasta una semana antes: más que eso ya no es un recordatorio del turno.
  z.object({ momento: z.literal("antes"), horasAntes: z.number().int().min(1).max(168), ...comunes }),
  z.object({
    momento: z.literal("despues"),
    dias: z.number().int().min(1).max(365),
    servicioId: z.number().int().positive().nullable().default(null),
    ...comunes,
  }),
  z.object({ momento: z.literal("cumpleanos"), dias: z.number().int().min(0).max(30), ...comunes }),
])
