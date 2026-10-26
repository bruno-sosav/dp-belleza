/** /api/admin/clientes. La clienta es la misma en turnera y tienda (por teléfono): la ficha trae ambos historiales. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import type { EstadoTurno } from "../../appointments/api/turnos.api"

/** Espejo de los DTOs de backend/src/modules/customers/schemas/clientes.dto.ts. */

/** Los datos de una clienta: lo que devuelven el alta y la edición. */
export type Cliente = {
  id: number
  nombre: string
  apellido: string | null
  telefono: string
  email: string | null
  /** Solo día y mes (el año no hace falta para saludarla). null si no se sabe. */
  cumple: { dia: number; mes: number } | null
  /** Notas internas de la dueña. La clienta no las ve. */
  notas: string | null
}

/** Una fila de la lista de Clientas (y lo que se elige al dar un turno). */
export type ClienteEnLista = Pick<Cliente, "id" | "nombre" | "apellido" | "telefono"> & {
  /** Turnos completados. */
  visitas: number
  ultimaVisita: string | null
  /** "2026-10-20 14:30" */
  proximoTurno: string | null
}

export type TurnoDeCliente = {
  id: number
  estado: EstadoTurno
  fecha: string
  horaInicio: string
  servicio: string
  precio: number
}

export type PedidoDeCliente = {
  id: number
  estado: string
  total: number
  unidades: number
  fecha: string
}

/** La ficha completa de una clienta. */
export type FichaCliente = Cliente & {
  /** "2026-06-18" */
  clienteDesde: string
  visitas: number
  /** Turnos en los que no vino. */
  ausencias: number
  gastado: { turnos: number; tienda: number; total: number }
  ultimaVisita: string | null
  proximoTurno: string | null
  turnos: TurnoDeCliente[]
  pedidos: PedidoDeCliente[]
}

export type CambiosCliente = Partial<Pick<Cliente, "nombre" | "apellido" | "telefono" | "email" | "cumple" | "notas">>

/** Lista, filtrada por nombre o teléfono. `q` vacío trae todas. */
export function useClientes(q: string) {
  const pedir = useCallback(
    () => api<ClienteEnLista[]>("/api/admin/clientes", { query: { q: q || undefined } }),
    [q],
  )
  return useApi(pedir)
}

export function useFichaCliente(id: number) {
  const pedir = useCallback(() => api<FichaCliente>(`/api/admin/clientes/${id}`), [id])
  return useApi(pedir)
}

export function actualizarCliente(id: number, cambios: CambiosCliente) {
  return api<Cliente>(`/api/admin/clientes/${id}`, { metodo: "PATCH", cuerpo: cambios })
}

/** Alta manual: para las que llegan por teléfono o en persona. Las de la web se crean solas. */
export function crearCliente(datos: CambiosCliente & { nombre: string; telefono: string }) {
  return api<Cliente>("/api/admin/clientes", { metodo: "POST", cuerpo: datos })
}

/** Solo funciona si no tiene turnos ni compras; si no, el backend responde 409 con el motivo. */
export function eliminarCliente(id: number) {
  return api<void>(`/api/admin/clientes/${id}`, { metodo: "DELETE" })
}

export const nombreCompleto = (c: Pick<Cliente, "nombre" | "apellido">) =>
  [c.nombre, c.apellido].filter(Boolean).join(" ")

/** Otra ficha, en la forma corta que devuelve la sugerencia de duplicados. */
export type FichaCorta = Pick<Cliente, "id" | "nombre" | "apellido" | "telefono">

/** Fichas que podrían ser la misma persona (mismo nombre y apellido, o mismo email). */
export function usePosiblesDuplicados(id: number) {
  const pedir = useCallback(() => api<FichaCorta[]>(`/api/admin/clientes/${id}/posibles-duplicados`), [id])
  return useApi(pedir)
}

/** Pasa turnos, compras y recordatorios de `otraId` a `id` y la borra. `telefonoDe`: con cuál teléfono queda. */
export function unirClientes(id: number, otraId: number, telefonoDe: "esta" | "otra") {
  return api<{ id: number; turnos: number; compras: number }>(`/api/admin/clientes/${id}/unir`, {
    metodo: "POST",
    cuerpo: { otraId, telefonoDe },
  })
}
