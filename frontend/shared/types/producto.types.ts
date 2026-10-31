/** Lo que devuelve `GET /api/tienda/productos`. Espejo de `aProductoPublico` (backend/src/modules/catalog/schemas/catalogo.dto.ts). */

export type Categoria = { id: number; nombre: string }

export type Producto = {
  id: number
  nombre: string
  descripcion: string | null
  /** En pesos. Es el precio que se cobra: el backend lo vuelve a leer de la base al comprar. */
  precio: number
  imagenUrl: string | null
  categoria: Categoria | null
  /** Si queda stock. La tienda no ve cuántas unidades hay. */
  disponible: boolean
}
