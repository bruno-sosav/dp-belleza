/**
 * Catálogo que muestra la tienda.
 *
 * MOCK: hoy es el catálogo hardcodeado de `@dp/shared/data/products`.
 *
 * Antes este archivo guardaba en localStorage para que el panel pudiera agregar
 * productos y verlos acá. Eso dejó de funcionar al separar las dos apps: el panel
 * vive en admin.dpbelleza.com.ar y el navegador aísla el almacenamiento por
 * origen, así que nada de lo que escriba el panel llega hasta acá. El canal entre
 * los dos es la base de datos, que todavía no existe.
 *
 * Cuando exista la API:
 *
 *    useProducts()     -> GET /api/productos
 *    useAllProducts()  -> GET /api/productos?incluir_inactivos=1
 *
 * y las pantallas no cambian.
 */
import { useMemo } from "react"
import { initialProducts } from "@dp/shared/data/products"

/** Todos los productos, incluidos los dados de baja. */
export function useAllProducts() {
  return initialProducts
}

/** Solo los activos: lo que se ofrece a la venta. */
export function useProducts() {
  const all = useAllProducts()
  return useMemo(() => all.filter((p) => p.active), [all])
}
