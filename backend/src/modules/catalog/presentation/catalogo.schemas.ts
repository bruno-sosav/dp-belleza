/** Lo que ENTRA por HTTP al catálogo, validado con zod. */
import { z } from "zod"
import { ETIQUETAS } from "../domain/servicio.js"

export const idParam = z.coerce.number().int().positive()

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null)

// Servicios: mismas claves que devuelve el GET (name, category…), así el panel
// edita lo que recibe y lo manda de vuelta tal cual.
const servicio = z.object({
  name: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(100_000_000),
  durationMin: z.number().int().min(5).max(600),
  shortDescription: textoOpcional(255),
  description: textoOpcional(5000),
  image: z.url().max(500).nullable().or(z.literal("").transform(() => null)),
  includes: z.array(z.string().trim().min(1).max(200)).max(20),
  professional: textoOpcional(100),
  badge: z.enum(ETIQUETAS).nullable(),
  recommendedSessions: z.number().int().min(1).max(50).nullable(),
  activo: z.boolean(),
})
export const nuevoServicio = servicio.partial({
  shortDescription: true,
  description: true,
  image: true,
  includes: true,
  professional: true,
  badge: true,
  recommendedSessions: true,
  activo: true,
})
export const cambiosServicio = servicio.partial()

export const filtrosProductos = z.object({
  categoria: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
})

const producto = z.object({
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  precio: z.number().nonnegative().max(99_999_999),
  stock: z.number().int().nonnegative(),
  imagenUrl: z.url().max(500).nullable().optional(),
  categoriaId: z.number().int().positive().nullable().optional(),
  activo: z.boolean().optional(),
})
export const nuevoProducto = producto
export const cambiosProducto = producto.partial()

const categoria = z.object({
  nombre: z.string().trim().min(1).max(100),
  activo: z.boolean().optional(),
})
export const nuevaCategoria = categoria
export const cambiosCategoria = categoria.partial()
