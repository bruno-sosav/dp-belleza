/**
 * Catálogo de servicios y horarios libres, para dar turnos desde el panel.
 *
 * Son los mismos endpoints públicos que usa la web (no hace falta login), así
 * la dueña ve exactamente los horarios que vería una clienta.
 */
import { useCallback } from "react"
import type { Service } from "@dp/shared/data/services"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"

export type HorarioLibre = { time: string; available: boolean }

/** Servicios activos, ordenados por categoría y nombre. */
export function useServicios() {
  const pedir = useCallback(() => api<Service[]>("/api/turnos/servicios"), [])
  return useApi(pedir)
}

/** Horarios de un servicio en un día. Sin servicio elegido no pide nada. */
export function useHorariosLibres(servicioId: number | null, fecha: string) {
  const pedir = useCallback(
    () =>
      servicioId
        ? api<HorarioLibre[]>("/api/turnos/disponibilidad", { query: { servicioId, fecha } })
        : Promise.resolve([]),
    [servicioId, fecha],
  )
  return useApi(pedir)
}
