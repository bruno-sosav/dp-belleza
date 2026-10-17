/**
 * Recordatorios por WhatsApp: /api/admin/recordatorios.
 *
 * La dueña arma TIPOS (nombre, cuántas horas antes, mensaje) y el backend
 * calcula a quién le toca cada uno, con el mensaje ya escrito. Acá solo se
 * abre WhatsApp con ese texto y se registra que se mandó.
 */
import { useCallback } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"

export type TipoRecordatorio = { id: number; nombre: string; horasAntes: number; mensaje: string }

export type AvisoParaMandar = {
  tipo: { id: number; nombre: string }
  turno: { id: number; fecha: string; hora: string; servicio: string }
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string }
  /** El texto ya armado, listo para mandar. */
  mensaje: string
}

/** Lo que se mandó u omitió hoy; `id` sirve para deshacerlo. */
export type AvisoHecho = AvisoParaMandar & { id: number; estado: "enviado" | "omitido" }

export function useRecordatorios() {
  const pedir = useCallback(
    () => api<{ paraMandar: AvisoParaMandar[]; hechosHoy: AvisoHecho[] }>("/api/admin/recordatorios"),
    [],
  )
  return useApi(pedir)
}

export function registrarAviso(turnoId: number, tipoId: number, estado: "enviado" | "omitido") {
  return api<{ id: number }>("/api/admin/recordatorios", { metodo: "POST", cuerpo: { turnoId, tipoId, estado } })
}

export function deshacerAviso(id: number) {
  return api<void>(`/api/admin/recordatorios/${id}`, { metodo: "DELETE" })
}

export function useTiposRecordatorio() {
  const pedir = useCallback(() => api<TipoRecordatorio[]>("/api/admin/recordatorios/tipos"), [])
  return useApi(pedir)
}

export type DatosTipo = Omit<TipoRecordatorio, "id">

export function crearTipo(datos: DatosTipo) {
  return api<TipoRecordatorio>("/api/admin/recordatorios/tipos", { metodo: "POST", cuerpo: datos })
}

export function actualizarTipo(id: number, datos: Partial<DatosTipo>) {
  return api<TipoRecordatorio>(`/api/admin/recordatorios/tipos/${id}`, { metodo: "PATCH", cuerpo: datos })
}

export function borrarTipo(id: number) {
  return api<void>(`/api/admin/recordatorios/tipos/${id}`, { metodo: "DELETE" })
}

/** 48 → "2 días antes" · 24 → "1 día antes" · 3 → "3 horas antes" */
export function formatAnticipacion(horas: number) {
  if (horas % 24 === 0) return horas === 24 ? "1 día antes" : `${horas / 24} días antes`
  return horas === 1 ? "1 hora antes" : `${horas} horas antes`
}
