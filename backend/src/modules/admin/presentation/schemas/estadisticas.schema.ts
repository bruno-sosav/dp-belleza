/** Lo que ENTRA a las estadísticas. */
import { z } from "zod"
import { fechaISO } from "../../../../core/validacion.schema.js"

export const consultaSerie = z.object({ dias: z.coerce.number().int().min(1).max(400).default(180) })
export const consultaPeriodo = z.object({ dias: z.coerce.number().int().min(1).max(400).default(30) })
export const consultaDia = z.object({ fecha: fechaISO })
