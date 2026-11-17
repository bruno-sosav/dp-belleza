/** Lo que ENTRA por HTTP a gift cards, validado con zod. */
import { z } from "zod"
import { ESTADOS_GIFT_CARD, MONTO_MAXIMO, MONTO_MINIMO } from "../models/giftCard.model.js"

export const idParam = z.coerce.number().int().positive()

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`

const monto = z
  .number()
  .int("El monto va en pesos, sin centavos")
  .min(MONTO_MINIMO, `El monto mínimo es de ${pesos(MONTO_MINIMO)}`)
  .max(MONTO_MAXIMO, `El monto máximo es de ${pesos(MONTO_MAXIMO)}`)

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined)

const datosDeVenta = {
  monto,
  para: opcional(100),
  mensaje: opcional(300),
}

/** La compra en la web: el teléfono hace falta para mandarle el código si algo sale mal. */
export const compraWeb = z.object({
  ...datosDeVenta,
  comprador: z.object({
    nombre: z.string().trim().min(1).max(100),
    telefono: z.string().trim().min(6).max(20),
    email: z.email().max(150).optional(),
  }),
})

/** La venta en el local (panel): con el medio con que pagó. */
export const ventaLocal = z.object({
  ...datosDeVenta,
  medio: z.enum(["efectivo", "debito", "credito", "transferencia", "mercadopago"]),
  comprador: z.object({
    nombre: z.string().trim().min(1).max(100),
    telefono: opcional(20),
    email: z.email().max(150).optional(),
  }),
})

export const consultaSaldo = z.object({ codigo: z.string().trim().min(1).max(20) })

export const filtrosGiftCards = z.object({
  estado: z.enum(ESTADOS_GIFT_CARD).optional(),
  q: z.string().trim().max(100).optional(),
})

export const tokenDePago = z.string().regex(/^[0-9a-f]{32}$/, "Link de pago inválido")
export const pagoId = z.string().regex(/^\d+$/).optional()
