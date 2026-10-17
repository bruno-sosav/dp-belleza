/**
 * Ajustes del local: /api/admin/configuracion. Las validaciones de cada clave
 * están en backend/src/admin/configuracion.ts.
 */
import { useCallback } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"

/** Todo llega como texto (la tabla es clave/valor). */
export type Configuracion = {
  nombre_negocio: string
  /** Normalizado: 549 + 10 dígitos. */
  telefono_negocio: string
  direccion_negocio: string
  email_negocio: string
  intervalo_turnos_min: string
  /** Hasta cuántas horas antes la clienta puede cancelar desde la web. */
  cancelacion_horas_minimas: string
}

export type CambiosConfiguracion = Partial<{
  nombre_negocio: string
  telefono_negocio: string
  direccion_negocio: string
  email_negocio: string
  intervalo_turnos_min: number
  cancelacion_horas_minimas: number
}>

export function useConfiguracion() {
  const pedir = useCallback(() => api<Configuracion>("/api/admin/configuracion"), [])
  return useApi(pedir)
}

export function guardarConfiguracion(cambios: CambiosConfiguracion) {
  return api<Configuracion>("/api/admin/configuracion", { metodo: "PATCH", cuerpo: cambios })
}
