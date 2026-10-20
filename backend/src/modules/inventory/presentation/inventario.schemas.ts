/** Lo que ENTRA por HTTP al inventario, validado con zod. */
import { z } from "zod"

export const idParam = z.coerce.number().int().positive()
/** Contó lo que hay y lo corrige. */
export const ajuste = z.object({ stock: z.number().int().min(0).max(1_000_000) })
/** Llegó mercadería. */
export const reposicion = z.object({ cantidad: z.number().int().positive().max(1_000_000) })
