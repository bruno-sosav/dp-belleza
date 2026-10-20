/** Lo que ENTRA por HTTP a pagos, validado con zod. */
import { z } from "zod"
import { fechaISO } from "../../../../core/validacion.js"
import { CONCEPTOS_COBRO, MEDIOS_PAGO } from "../../domain/cobro.js"

export const idParam = z.coerce.number().int().positive()

export const diaDeCaja = z.object({ fecha: fechaISO.optional() })

export const nuevoCobro = z.object({
  monto: z.number().positive().max(100_000_000),
  medio: z.enum(MEDIOS_PAGO),
  concepto: z.enum(CONCEPTOS_COBRO),
  turnoId: z.number().int().positive().optional(),
  descripcion: z.string().trim().max(255).optional(),
})

const credencial = (nombre: string) => z.string().trim().regex(/^(APP_USR|TEST)-[\w-]{20,}$/, `${nombre} empieza con APP_USR- o TEST-`)

export const credenciales = z.object({
  accessToken: credencial("El Access Token"),
  publicKey: credencial("La Public Key"),
  webhookSecret: z.string().trim().min(10).max(200).optional(),
})

export const consultaEstadoPago = z.object({ referencia: z.string().min(1).max(100) })
