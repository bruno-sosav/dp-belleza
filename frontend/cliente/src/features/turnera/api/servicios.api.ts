import { useCallback } from "react"
import type { Service } from "@dp/shared/types/servicio.types"
import { api, ApiError } from "../lib/api"
import { useApi } from "../lib/useApi"

const fetchServices = () => api<Service[]>("/api/turnos/servicios")

/** Catálogo de servicios activos. */
export function useServices() {
  return useApi(fetchServices)
}

/** Servicio por id o `null` si no existe (un id no numérico ni se pide). Otros errores sí llegan como error. */
export function useService(rawId: string | undefined) {
  const id = Number(rawId)
  const valid = Number.isInteger(id) && id > 0
  const request = useCallback(async () => {
    if (!valid) return null
    try {
      return await api<Service>(`/api/turnos/servicios/${id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }, [id, valid])
  return useApi(request)
}
