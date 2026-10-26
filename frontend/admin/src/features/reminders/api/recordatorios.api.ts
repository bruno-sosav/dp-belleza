/**
 * Recordatorios por WhatsApp: /api/admin/recordatorios.
 *
 * La dueña arma TIPOS (nombre, cuántas horas antes, mensaje) y el backend
 * calcula a quién le toca cada uno, con el mensaje ya escrito. Acá solo se
 * abre WhatsApp con ese texto y se registra que se mandó.
 */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

/**
 * Desde dónde se cuenta:
 *   antes       X horas antes de un turno pedido
 *   despues     X días después de una visita completada (opcional: de un servicio)
 *   cumpleanos  X días antes del cumpleaños (0 = ese día)
 */
export type Momento = "antes" | "despues" | "cumpleanos"

export type TipoRecordatorio = {
  id: number
  nombre: string
  momento: Momento
  horasAntes: number | null
  dias: number | null
  servicio: { id: number; nombre: string } | null
  mensaje: string
}

export type AvisoParaMandar = {
  momento: Momento
  tipo: { id: number; nombre: string }
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string }
  /** Antes: el turno que viene. Después: la visita que pasó. Cumpleaños: null. */
  turno: { id: number; fecha: string; hora: string; servicio: string } | null
  /** Solo cumpleaños. `faltan` = 0 es hoy. */
  cumple: { dia: number; mes: number; faltan: number } | null
  /** El texto ya armado, listo para mandar. */
  mensaje: string
  /** Lo que se manda de vuelta al marcarlo. */
  registro: { tipoId: number; turnoId?: number; clienteId?: number; anio?: number }
}

/** Lo que se mandó u omitió hoy; `id` sirve para deshacerlo. */
export type AvisoHecho = {
  id: number
  estado: "enviado" | "omitido"
  tipo: string
  cliente: { nombre: string; apellido: string | null }
}

export function useRecordatorios() {
  const pedir = useCallback(
    () => api<{ paraMandar: AvisoParaMandar[]; hechosHoy: AvisoHecho[] }>("/api/admin/recordatorios"),
    [],
  )
  return useApi(pedir)
}

export function registrarAviso(aviso: AvisoParaMandar, estado: "enviado" | "omitido") {
  return api<{ id: number }>("/api/admin/recordatorios", { metodo: "POST", cuerpo: { ...aviso.registro, estado } })
}

export function deshacerAviso(id: number) {
  return api<void>(`/api/admin/recordatorios/${id}`, { metodo: "DELETE" })
}

export function useTiposRecordatorio() {
  const pedir = useCallback(() => api<TipoRecordatorio[]>("/api/admin/recordatorios/tipos"), [])
  return useApi(pedir)
}

/** Lo que se guarda: cada momento con su dato de "cuándo". */
export type DatosTipo =
  | { momento: "antes"; nombre: string; mensaje: string; horasAntes: number }
  | { momento: "despues"; nombre: string; mensaje: string; dias: number; servicioId: number | null }
  | { momento: "cumpleanos"; nombre: string; mensaje: string; dias: number }

export function crearTipo(datos: DatosTipo) {
  return api<TipoRecordatorio>("/api/admin/recordatorios/tipos", { metodo: "POST", cuerpo: datos })
}

export function actualizarTipo(id: number, datos: DatosTipo) {
  return api<TipoRecordatorio>(`/api/admin/recordatorios/tipos/${id}`, { metodo: "PATCH", cuerpo: datos })
}

export function borrarTipo(id: number) {
  return api<void>(`/api/admin/recordatorios/tipos/${id}`, { metodo: "DELETE" })
}

/** 48 → "2 días antes" · 24 → "1 día antes" · 3 → "3 horas antes" · 168 → "1 semana antes" */
export function formatAnticipacion(horas: number) {
  if (horas === 168) return "1 semana antes"
  if (horas % 24 === 0) return horas === 24 ? "1 día antes" : `${horas / 24} días antes`
  return horas === 1 ? "1 hora antes" : `${horas} horas antes`
}

const dias = (n: number) => (n === 1 ? "1 día" : n % 7 === 0 ? (n === 7 ? "1 semana" : `${n / 7} semanas`) : `${n} días`)

/** "2 días antes del turno" · "21 días después de la visita de Depilación" · "El día del cumpleaños" */
export function describirCuando(t: Pick<TipoRecordatorio, "momento" | "horasAntes" | "dias" | "servicio">) {
  if (t.momento === "antes") return `${formatAnticipacion(t.horasAntes ?? 0)} del turno`
  if (t.momento === "despues") {
    return `${dias(t.dias ?? 0)} después de la visita${t.servicio ? ` de ${t.servicio.nombre}` : ""}`
  }
  return t.dias ? `${dias(t.dias)} antes del cumpleaños` : "El día del cumpleaños"
}
