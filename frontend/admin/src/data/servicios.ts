/**
 * Servicios en el panel.
 *
 * Para dar un turno se usan los endpoints públicos de la web (servicios activos
 * y horarios libres), así la dueña ve exactamente lo que vería una clienta. La
 * sección Servicios usa /api/admin/servicios, que trae también los pausados.
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

// ---------------------------------------------------------------- sección Servicios

/** Un servicio como lo ve el panel: también los pausados. */
export type ServicioAdmin = Service & {
  /** false = pausado: no se ve en la web ni se puede reservar. */
  activo: boolean
  /** Turnos pedidos de hoy en adelante. */
  turnosProximos: number
}

/** Lo que se manda al guardar. Las mismas claves que devuelve el GET. */
export type DatosServicio = {
  name: string
  category: string
  price: number
  durationMin: number
  shortDescription: string | null
  description: string | null
  image: string | null
  includes: string[]
  professional: string | null
  badge: Service["badge"] | null
  recommendedSessions: number | null
}

export function useServiciosAdmin() {
  const pedir = useCallback(() => api<ServicioAdmin[]>("/api/admin/servicios"), [])
  return useApi(pedir)
}

export function useServicioAdmin(id: number | null) {
  const pedir = useCallback(
    () => (id ? api<ServicioAdmin>(`/api/admin/servicios/${id}`) : Promise.resolve(null)),
    [id],
  )
  return useApi(pedir)
}

export function crearServicio(datos: DatosServicio) {
  return api<ServicioAdmin>("/api/admin/servicios", { metodo: "POST", cuerpo: datos })
}

export function actualizarServicio(id: number, cambios: Partial<DatosServicio> & { activo?: boolean }) {
  return api<ServicioAdmin>(`/api/admin/servicios/${id}`, { metodo: "PATCH", cuerpo: cambios })
}

/** "75" → "1 h 15 min" */
export function formatDuracion(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
