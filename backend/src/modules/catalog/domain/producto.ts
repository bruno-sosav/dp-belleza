/**
 * Productos y categorías de la tienda. Dominio puro.
 *
 * El stock vive en el producto por ahora; cuando se arme el módulo inventory/,
 * los movimientos de stock (vender, reponer) pasan a ser de ese módulo.
 */

export type Categoria = { id: number; nombre: string; activo: boolean }

export type Producto = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  imagenUrl: string | null
  /** false = dado de baja: no se ve en la tienda (los pedidos viejos lo siguen referenciando). */
  activo: boolean
  categoria: { id: number; nombre: string } | null
}

export type DatosProducto = {
  nombre: string
  descripcion?: string | null
  precio: number
  stock: number
  imagenUrl?: string | null
  categoriaId?: number | null
  activo?: boolean
}
export type CambiosProducto = Partial<DatosProducto>

/** Lo que ve la clienta: si hay o no, no cuántas unidades quedan. */
export const disponible = (p: Pick<Producto, "stock">) => p.stock > 0
