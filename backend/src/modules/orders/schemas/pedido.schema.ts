/** Lo que ENTRA por HTTP a orders, validado con zod. */
import { z } from "zod"
import { ESTADOS_PEDIDO } from "../models/pedido.model.js"

export const idParam = z.coerce.number().int().positive()

/** Checkout de la web. */
export const nuevoPedido = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(1).max(100),
    apellido: z.string().trim().max(100).optional(),
    telefono: z.string().trim().min(6).max(30),
    email: z.email().max(150).optional(),
  }),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().int().positive().max(100),
      }),
    )
    .min(1, "El pedido no tiene productos")
    .max(50),
  notas: z.string().trim().max(1000).optional(),
})

/** Filtros de la lista del panel. */
export const filtrosPedidos = z.object({
  estado: z.enum(ESTADOS_PEDIDO).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
})

export const cambioDeEstado = z.object({ estado: z.enum(ESTADOS_PEDIDO) })
