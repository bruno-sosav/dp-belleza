/** Buscar y cancelar con código + teléfono. Por POST para que el teléfono no quede en la URL. */
import { api } from "../lib/api"

export type MiTurno = {
  /** "DP-000123" */
  codigo: string
  estado: "reservado" | "confirmado" | "completado" | "ausente" | "cancelado"
  nombre: string
  servicio: { id: number; nombre: string; duracionMin: number }
  /** "2026-10-20" */
  fecha: string
  /** "14:30" */
  hora: string
  precio: number
  /** Si todavía puede cancelarlo ella sola. */
  puedeCancelar: boolean
  /** Si ya no puede porque falta poco: hay que ofrecerle WhatsApp. */
  fueraDeTermino: boolean
  horasMinimas: number
}

export type DatosMiTurno = { codigo: string; telefono: string }

export function buscarMiTurno(datos: DatosMiTurno) {
  return api<MiTurno>("/api/turnos/mi-turno", { method: "POST", body: datos })
}

export function cancelarMiTurno(datos: DatosMiTurno) {
  return api<MiTurno>("/api/turnos/mi-turno/cancelar", { method: "POST", body: datos })
}

/** 24 → "24 hs antes" · 48 → "48 hs antes" · 0 → "hasta que empiece" */
export function textoCancelacion(horas: number) {
  return horas === 0 ? "hasta que empiece el turno" : `hasta ${horas} hs antes`
}
