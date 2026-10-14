import { z } from "zod"

export const filtrosProductos = z.object({
  categoria: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
})

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

export type NuevoPedido = z.infer<typeof nuevoPedido>
