/**
 * Pedidos de la tienda que todavía hay que preparar o entregar, para la
 * pantalla de inicio.
 *
 * SOLO LECTURA sobre `GET /api/admin/pedidos`, que es del módulo de ecommerce.
 * La gestión de pedidos (cambiarles el estado, ver el detalle) es de esa
 * sección; acá solo se avisa que hay pedidos esperando.
 */
import { useCallback } from "react"
import { api } from "../shared/lib/api"
import { useApi } from "../shared/lib/useApi"

export type PedidoResumen = {
  id: number
  estado: "pendiente" | "confirmado"
  total: number
  unidades: number
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string }
  /** "2026-10-15 10:32:00" */
  creadoEn: string
}

/** Pendientes y confirmados (los que faltan entregar), del más viejo al más nuevo. */
export function usePedidosPendientes() {
  const pedir = useCallback(async () => {
    const [pendientes, confirmados] = await Promise.all([
      api<PedidoResumen[]>("/api/admin/pedidos", { query: { estado: "pendiente" } }),
      api<PedidoResumen[]>("/api/admin/pedidos", { query: { estado: "confirmado" } }),
    ])
    // El más viejo primero: es el que lleva más tiempo esperando.
    return [...pendientes, ...confirmados].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  }, [])
  return useApi(pedir)
}
