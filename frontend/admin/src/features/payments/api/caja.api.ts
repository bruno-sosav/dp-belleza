/** /api/admin/caja y /api/admin/cobros. Completar cobrando está en appointments (completarTurno). */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import type { MedioPago } from "../lib/medios"

export type Cobro = {
  id: number
  /** "2026-10-19 14:32" */
  fechaHora: string
  monto: number
  medio: MedioPago
  concepto: "sena" | "turno" | "pedido" | "otro"
  descripcion: string | null
  turno: { id: number; servicio: string; fecha: string; hora: string } | null
  cliente: { nombre: string } | null
}

export type SinCobrar = {
  turnoId: number
  hora: string
  servicio: string
  cliente: { nombre: string }
  precio: number
  cobrado: number
  falta: number
}

export type DiaDeCaja = {
  fecha: string
  cobros: Cobro[]
  totales: { porMedio: Record<MedioPago, number>; total: number }
  sinCobrar: SinCobrar[]
}

export function useCaja(fecha: string) {
  const pedir = useCallback(() => api<DiaDeCaja>("/api/admin/caja", { query: { fecha } }), [fecha])
  return useApi(pedir)
}

export type NuevoCobro =
  | { monto: number; medio: MedioPago; concepto: "turno" | "sena"; turnoId: number }
  | { monto: number; medio: MedioPago; concepto: "otro"; descripcion: string }

export function registrarCobro(cobro: NuevoCobro) {
  return api<{ id: number }>("/api/admin/cobros", { metodo: "POST", cuerpo: cobro })
}

export function borrarCobro(id: number) {
  return api<void>(`/api/admin/cobros/${id}`, { metodo: "DELETE" })
}
