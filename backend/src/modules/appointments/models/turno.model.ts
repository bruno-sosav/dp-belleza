/** Turno: clienta, servicio, día y horario. Tipos y reglas. */
import type { Momento } from "../../../core/reloj.port.js"
import type { EstadoTurno } from "./estados.model.js"

export type EstadoSena = "pendiente" | "pagada" | "vencida"
export type CanceladoPor = "local" | "clienta" | "sistema"

export type Turno = {
  id: number
  clienteId: number
  servicioId: number
  /** "2026-10-20" */
  fecha: string
  /** "14:30" */
  horaInicio: string
  horaFin: string
  estado: EstadoTurno
  canceladoPor: CanceladoPor | null
  /** Congelado al reservar: si sube la lista, el turno conserva el suyo. */
  precio: number
  notas: string | null
  /** Solo reservas de la web con seña de Mercado Pago. */
  sena: { monto: number; estado: EstadoSena; token: string } | null
}

// ---------------------------------------------------------------- reglas

/** El código que ve la clienta: "DP-000123". Sale del id, así lo puede dictar en el local. */
export const codigoDeTurno = (id: number) => `DP-${String(id).padStart(6, "0")}`

/** "DP-000123", "dp 123", "123" → 123. null si no tiene números. */
export function idDesdeCodigo(texto: string): number | null {
  const n = Number(texto.replace(/\D/g, ""))
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Si un turno de ese día y hora ya empezó. */
export function yaEmpezo(fecha: string, inicioMin: number, ahora: Momento): boolean {
  return fecha < ahora.fecha || (fecha === ahora.fecha && inicioMin <= ahora.minutos)
}

/** Solo un completado puede estar en el pasado (vino sin turno). No puede pasar la medianoche. */
export function problemaAlDar(estado: EstadoTurno, pasado: boolean, finMin: number, duracionMin: number): string | null {
  if (pasado && estado !== "completado") return "Ese horario ya pasó."
  if (!pasado && estado === "completado") return "Todavía no es la hora de ese turno: no se puede cargar como completado."
  if (finMin > 24 * 60) return `El turno de ${duracionMin} minutos terminaría pasada la medianoche.`
  return null
}

/** cancelado: no se mueve · pedido: solo hacia adelante · completado/no vino: se corrige en el pasado. */
export function problemaAlMover(estado: EstadoTurno, pasado: boolean): { tipo: "conflicto" | "invalido"; mensaje: string } | null {
  if (estado === "cancelado") return { tipo: "conflicto", mensaje: "Un turno cancelado no se puede cambiar de día. Dale un turno nuevo." }
  const pedido = estado === "reservado" || estado === "confirmado"
  if (pedido && pasado) return { tipo: "invalido", mensaje: "Ese horario ya pasó. Elegí uno de ahora en adelante." }
  if (!pedido && !pasado) {
    return { tipo: "invalido", mensaje: `Este turno figura como ${estado === "completado" ? "completado" : '"no vino"'}: solo se puede corregir a un horario que ya pasó.` }
  }
  return null
}

/** La clienta cancela sola hasta `horasMinimas` antes (0 = hasta que empiece). */
export function puedeCancelar(inicio: string, ahora: string, horasMinimas: number): boolean {
  const aMs = (dt: string) => {
    const [f, h] = dt.split(" ")
    const [y, m, d] = f.split("-").map(Number)
    const [hh, mm] = h.split(":").map(Number)
    return new Date(y, m - 1, d, hh, mm).getTime()
  }
  return aMs(inicio) - aMs(ahora) >= horasMinimas * 3_600_000 && aMs(inicio) > aMs(ahora)
}

export const esPedido = (estado: EstadoTurno) => estado === "reservado" || estado === "confirmado"
