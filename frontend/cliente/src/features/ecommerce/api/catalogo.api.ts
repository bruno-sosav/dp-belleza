/** Catálogo de la tienda: /api/tienda/categorias y /api/tienda/productos (catalogo.controller.ts). Solo lo activo. */
import { useCallback } from "react"
import type { Categoria, Producto } from "@dp/shared/types/producto.types"
import { api, ApiError } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

const fetchCategorias = () => api<Categoria[]>("/api/tienda/categorias")
const fetchProductos = () => api<Producto[]>("/api/tienda/productos")

/** Categorías activas, para los filtros y el menú. */
export function useCategorias() {
  return useApi(fetchCategorias)
}

/** Todos los productos activos. Son pocos: los filtros y el orden se hacen en la pantalla. */
export function useProductos() {
  return useApi(fetchProductos)
}

/** Producto por id o `null` si no existe o está dado de baja (un id no numérico ni se pide). */
export function useProducto(rawId: string | undefined) {
  const id = Number(rawId)
  const valid = Number.isInteger(id) && id > 0
  const request = useCallback(async () => {
    if (!valid) return null
    try {
      return await api<Producto>(`/api/tienda/productos/${id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }, [id, valid])
  return useApi(request)
}
