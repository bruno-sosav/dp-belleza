/** Lo que ENTRA por HTTP a shipping, validado con zod. */
import { z } from "zod"
import { PROVINCIAS } from "../models/envio.model.js"

/** Cotizar desde la web: el subtotal es solo para mostrar si es gratis; al comprar se recalcula. */
export const consultaCotizacion = z.object({
  cp: z.string().trim().min(4).max(10),
  unidades: z.coerce.number().int().min(1).max(500),
  subtotal: z.coerce.number().min(0).max(100_000_000),
})

/** La dirección de envío que manda el checkout. */
export const direccionDeEnvio = z.object({
  calle: z.string().trim().min(3).max(200),
  ciudad: z.string().trim().min(2).max(100),
  provincia: z.enum(PROVINCIAS),
  codigoPostal: z.string().trim().min(4).max(10),
})

export const cuentaAndreani = z.object({
  usuario: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  cliente: z.string().trim().min(1).max(30),
  contrato: z.string().trim().min(1).max(30),
  entorno: z.enum(["qa", "produccion"]),
})
