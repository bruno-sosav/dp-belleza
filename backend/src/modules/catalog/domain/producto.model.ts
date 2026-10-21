/**
 * Productos y categorías de la tienda. Dominio puro.
 *
 * El stock es del módulo inventory/: el catálogo solo lo pone al crear el
 * producto (stock inicial) y lo muestra; venderlo, devolverlo, reponerlo o
 * corregirlo lo hace el inventario.
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
/** Editar un producto no toca el stock: eso es del inventario. */
export type CambiosProducto = Partial<Omit<DatosProducto, "stock">>

/** Lo que necesita una venta del catálogo: que esté activo y a qué precio. */
export type ProductoVendible = Pick<Producto, "id" | "nombre" | "precio">

/** Lo que ve la clienta: si hay o no, no cuántas unidades quedan. */
export const disponible = (p: Pick<Producto, "stock">) => p.stock > 0
