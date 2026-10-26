/**
 * Turnos del panel: pedidos a /api/admin/turnos.
 *
 * Las reglas de qué estado se puede pasar a cuál viven en el backend
 * (backend/src/modules/appointments/models/estados.model.ts). Acá solo se decide qué botones mostrar; si
 * el backend rechaza un cambio, el error llega como ApiError con su mensaje.
 */
import { useCallback, useState } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"
import type { MedioPago } from "../../payments/lib/medios"
import { registrarCobro } from "../../payments/api/caja.api"

export type EstadoTurno = "reservado" | "confirmado" | "completado" | "ausente" | "cancelado"

export type Turno = {
  id: number
  estado: EstadoTurno
  /** Solo en cancelados: "clienta" si lo canceló ella desde la web ("Mi turno"). */
  canceladoPor: "local" | "clienta" | "sistema" | null
  /** Lo que ya entró a la caja por este turno (seña + lo cobrado al terminar). */
  cobrado: number
  /** Solo turnos reservados en la web con seña de Mercado Pago. */
  sena: { monto: number; estado: "pendiente" | "pagada" | "vencida" } | null
  /** "2026-10-15" */
  fecha: string
  /** "14:30" */
  horaInicio: string
  horaFin: string
  precio: number
  notas: string | null
  servicio: { id: number; nombre: string }
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string }
}

/** Turnos entre dos fechas inclusive, ordenados por horario. Máximo 62 días. */
export function useTurnos(desde: string, hasta: string) {
  const pedir = useCallback(
    () => api<Turno[]>("/api/admin/turnos", { query: { desde, hasta } }),
    [desde, hasta],
  )
  return useApi(pedir)
}

export function cambiarEstadoTurno(id: number, estado: EstadoTurno) {
  return api<Turno>(`/api/admin/turnos/${id}/estado`, { metodo: "PATCH", cuerpo: { estado } })
}

export type NuevoTurno = {
  clienteId: number
  servicioId: number
  /** "2026-10-20" */
  fecha: string
  /** "14:30" */
  hora: string
  notas?: string
  /** Para dar un turno fuera del horario de atención. Nunca deja pisar otro turno. */
  fueraDeHorario?: boolean
}

/** Un turno que carga la dueña. Entra como "confirmado", o "completado" si el horario ya pasó (vino sin turno). */
export function crearTurno(datos: NuevoTurno) {
  return api<Turno>("/api/admin/turnos", { metodo: "POST", cuerpo: datos })
}

/**
 * Marca el turno como completado y anota lo que se cobró, en una sola
 * operación. `cobro: null` = "todavía no cobré" (queda en Caja → sin cobrar).
 */
export function completarTurno(id: number, cobro: { monto: number; medio: MedioPago } | null) {
  return api<Turno>(`/api/admin/turnos/${id}/completar`, { metodo: "POST", cuerpo: { cobro } })
}

/** Lo que falta cobrar de un turno: el precio menos lo que ya entró (la seña, por ejemplo). */
export const faltaCobrar = (t: Pick<Turno, "precio" | "cobrado">) => Math.max(0, t.precio - t.cobrado)

export type CambiosTurno = {
  fecha?: string
  hora?: string
  servicioId?: number
  notas?: string | null
  fueraDeHorario?: boolean
}

/**
 * Reprogramar o corregir un turno. Las reglas (qué se puede mover según el
 * estado, el precio al cambiar de servicio) están en backend/src/modules/appointments/models/turno.model.ts.
 */
export function editarTurno(id: number, cambios: CambiosTurno) {
  return api<Turno>(`/api/admin/turnos/${id}`, { metodo: "PATCH", cuerpo: cambios })
}

/**
 * Turnos de un rango + cómo cambiarles el estado.
 *
 * Al cambiar un estado se muestra enseguida el turno que devolvió el PATCH y se
 * recarga la lista en segundo plano. Los cambios se guardan junto con la lista
 * sobre la que se hicieron (`base`): cuando llega la lista recargada ya trae el
 * cambio, y los de la lista vieja se descartan solos, sin un efecto que limpie.
 */
export function useAgenda(desde: string, hasta: string) {
  const carga = useTurnos(desde, hasta)
  const [cambios, setCambios] = useState<{ base: Turno[] | null; porId: Map<number, Turno> }>({
    base: null,
    porId: new Map(),
  })

  const vigentes = cambios.base === carga.datos ? cambios.porId : null
  const turnos = carga.datos?.map((t) => vigentes?.get(t.id) ?? t) ?? null

  const { datos, recargar } = carga
  /** Muestra enseguida el turno que devolvió el servidor y recarga la lista en segundo plano. */
  const aplicar = useCallback(
    async (id: number, pedido: Promise<Turno>) => {
      const actualizado = await pedido
      setCambios((prev) => ({
        base: datos,
        porId: new Map(prev.base === datos ? prev.porId : []).set(id, actualizado),
      }))
      recargar()
    },
    [datos, recargar],
  )
  const cambiarEstado = useCallback((id: number, estado: EstadoTurno) => aplicar(id, cambiarEstadoTurno(id, estado)), [aplicar])
  const completar = useCallback(
    (id: number, cobro: { monto: number; medio: MedioPago } | null) => aplicar(id, completarTurno(id, cobro)),
    [aplicar],
  )

  /** Cobrar lo que falta de un turno ya completado (por ejemplo, pagó después). */
  const cobrar = useCallback(
    async (id: number, cobro: { monto: number; medio: MedioPago }) => {
      await registrarCobro({ ...cobro, concepto: "turno", turnoId: id })
      recargar()
    },
    [recargar],
  )

  return { ...carga, turnos, cambiarEstado, completar, cobrar }
}

/** Un turno abierto todavía espera que la dueña diga qué pasó. */
export const estaAbierto = (t: Turno) => t.estado === "reservado" || t.estado === "confirmado"

export const nombreCliente = (t: Pick<Turno, "cliente"> | { cliente: { nombre: string; apellido: string | null } }) =>
  [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
