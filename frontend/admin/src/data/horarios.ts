/**
 * Horario de atención y bloqueos (vacaciones, feriados, un rato puntual).
 *
 * El horario se LEE del endpoint público de la turnera, el mismo que usa la web;
 * se guarda y los bloqueos se manejan por /api/admin (ver backend/src/admin/agenda.ts).
 */
import { useCallback } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"
/**
 * Un turno que quedó afuera de un cambio de horario o de un día cerrado: lo
 * que hace falta para avisarle a la clienta (el DTO aTurnoParaAvisar del backend).
 */
export type TurnoParaAvisar = {
  id: number
  fecha: string
  horaInicio: string
  servicio: { nombre: string }
  cliente: { nombre: string; apellido: string | null; telefono: string }
}

export type Horario = {
  /** 1 = lunes … 7 = domingo (ISO). Los días que no aparecen, el local está cerrado. */
  diaSemana: number
  /** "09:00" */
  desde: string
  hasta: string
}

export function useHorarios() {
  const pedir = useCallback(() => api<Horario[]>("/api/turnos/horarios"), [])
  return useApi(pedir)
}

/** Respuesta al guardar: el horario como quedó y los turnos pedidos que ya no entran. */
export type HorarioGuardado = { horarios: Horario[]; turnosFuera: TurnoParaAvisar[] }

/** Reemplaza el horario de la semana entera. Un día sin franjas queda cerrado. */
export function guardarHorarios(franjas: Horario[]) {
  return api<HorarioGuardado>("/api/admin/horarios", { metodo: "PUT", cuerpo: { franjas } })
}

// ---------------------------------------------------------------- bloqueos

/** Un período en que el local no atiende. Las fechas vienen como "2026-12-24 00:00". */
export type Bloqueo = { id: number; desde: string; hasta: string; motivo: string | null }

/** Sin rango: los que todavía no terminaron. Con rango: los que pisan esos días. */
export function useBloqueos(desde?: string, hasta?: string) {
  const pedir = useCallback(() => api<Bloqueo[]>("/api/admin/bloqueos", { query: { desde, hasta } }), [desde, hasta])
  return useApi(pedir)
}

export function crearBloqueo(datos: { desde: string; hasta: string; motivo?: string }) {
  return api<{ bloqueo: Bloqueo; turnosAfectados: TurnoParaAvisar[] }>("/api/admin/bloqueos", { metodo: "POST", cuerpo: datos })
}

export function quitarBloqueo(id: number) {
  return api<void>(`/api/admin/bloqueos/${id}`, { metodo: "DELETE" })
}
