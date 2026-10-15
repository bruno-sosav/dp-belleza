/**
 * Horario de atención del local, para sombrear en la agenda las horas en que
 * está cerrado. Es el endpoint público de la turnera (no hace falta login).
 */
import { useCallback } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"

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
