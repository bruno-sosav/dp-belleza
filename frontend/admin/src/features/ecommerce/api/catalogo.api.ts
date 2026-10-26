/**
 * Productos y categorías de la tienda en el panel: /api/admin/productos y /api/admin/categorias
 * (catalogo.controller.ts). Incluye los dados de baja. Lo que se guarda acá aparece en la web.
 */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type CategoriaAdmin = { id: number; nombre: string; activo: boolean }

/** Un producto como lo ve el panel: con el stock exacto y si está dado de baja. */
export type ProductoAdmin = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  imagenUrl: string | null
  /** false = dado de baja: no se ve en la tienda, pero no se borra. */
  activo: boolean
  categoria: { id: number; nombre: string } | null
}

/** Lo que se manda al crear. El stock inicial va acá; después lo maneja el inventario. */
export type NuevoProducto = {
  nombre: string
  precio: number
  stock: number
  descripcion?: string | null
  imagenUrl?: string | null
  categoriaId?: number | null
}

export function useProductosAdmin() {
  const pedir = useCallback(() => api<ProductoAdmin[]>("/api/admin/productos"), [])
  return useApi(pedir)
}

export function useCategoriasAdmin() {
  const pedir = useCallback(() => api<CategoriaAdmin[]>("/api/admin/categorias"), [])
  return useApi(pedir)
}

export function crearProducto(datos: NuevoProducto) {
  return api<ProductoAdmin>("/api/admin/productos", { metodo: "POST", cuerpo: datos })
}

/** Dar de baja (false) o reactivar (true). Nunca se borra el producto. */
export function cambiarActivo(id: number, activo: boolean) {
  return api<ProductoAdmin>(`/api/admin/productos/${id}`, { metodo: "PATCH", cuerpo: { activo } })
}

export function crearCategoria(nombre: string) {
  return api<CategoriaAdmin>("/api/admin/categorias", { metodo: "POST", cuerpo: { nombre } })
}
