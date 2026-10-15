/**
 * Turnos del panel: pedidos a /api/admin/turnos.
 *
 * Las reglas de qué estado se puede pasar a cuál viven en el backend
 * (backend/src/turnera/estados.ts). Acá solo se decide qué botones mostrar; si
 * el backend rechaza un cambio, el error llega como ApiError con su mensaje.
 */
import { useCallback, useState } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"

export type EstadoTurno = "reservado" | "confirmado" | "completado" | "ausente" | "cancelado"

export type Turno = {
  id: number
  estado: EstadoTurno
  /** "2026-10-15" */
  fecha: string
  /** "14:30" */
  horaInicio: string
  horaFin: string
  precio: number
  notas: string | null
  servicio: { id: number; nombre: string; duracionMin: number }
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string; email: string | null }
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
  const cambiarEstado = useCallback(
    async (id: number, estado: EstadoTurno) => {
      const actualizado = await cambiarEstadoTurno(id, estado)
      setCambios((prev) => ({
        base: datos,
        porId: new Map(prev.base === datos ? prev.porId : []).set(id, actualizado),
      }))
      recargar()
    },
    [datos, recargar],
  )

  return { ...carga, turnos, cambiarEstado }
}

/** Un turno abierto todavía espera que la dueña diga qué pasó. */
export const estaAbierto = (t: Turno) => t.estado === "reservado" || t.estado === "confirmado"

export const nombreCliente = (t: Turno) =>
  [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
