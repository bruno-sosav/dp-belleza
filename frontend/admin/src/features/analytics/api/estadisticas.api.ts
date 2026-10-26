/**
 * Estadísticas del panel: pedidos a la API.
 *
 * Los números vienen YA CALCULADOS del backend (GROUP BY en SQL). Antes se
 * generaban 180 días de turnos y pedidos falsos acá en el navegador
 * (`history.ts`) y los promedios se sacaban en el cliente.
 */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import type { DayStats, Period } from "../../../shared/lib/stats"

export type RankingApi = { id: number; name: string; count: number; revenue: number }

type RespuestaDias = {
  dias: DayStats[]
  /** false mientras el módulo de ecommerce no sume su parte a la serie. */
  tiendaConectada: boolean
}

/**
 * La serie diaria completa.
 *
 * Se piden 180 días de una sola vez porque el filtro de período (7/30/90) y su
 * comparación con el período anterior necesitan como máximo 180 días: así
 * cambiar el filtro no dispara otro pedido.
 */
export function useDias() {
  const pedir = useCallback(
    () => api<RespuestaDias>("/api/admin/stats/dias", { query: { dias: 180 } }),
    [],
  )
  return useApi(pedir)
}

/** Ranking de servicios del período. Se recarga al cambiar el filtro. */
export function useRankingServicios(period: Period) {
  const pedir = useCallback(
    () => api<RankingApi[]>("/api/admin/stats/servicios", { query: { dias: period } }),
    [period],
  )
  return useApi(pedir)
}

/** Qué servicios se hicieron un día puntual. Para el detalle del calendario. */
export function useServiciosDelDia(fecha: string | null) {
  const pedir = useCallback(
    () =>
      fecha
        ? api<RankingApi[]>("/api/admin/stats/servicios-del-dia", { query: { fecha } })
        : Promise.resolve([]),
    [fecha],
  )
  return useApi(pedir)
}
