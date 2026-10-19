/**
 * Puertos de la agenda (horario, días cerrados y disponibilidad). Las
 * implementaciones están en infrastructure/; los servicios vienen del módulo
 * de catálogo a través de un adaptador.
 */
import type { Transaccion } from "../../../core/transaccion.js"
import type { Bloqueo } from "./bloqueo.js"
import type { Ocupado } from "./disponibilidad.js"
import type { Franja } from "./horario.js"
import type { ReglasReserva } from "./reglasReserva.js"

export interface HorarioRepository {
  /** Ordenadas por día y hora. Los días que no aparecen están cerrados. */
  listar(): Promise<Franja[]>
  /** Reemplaza la semana entera. */
  reemplazar(franjas: Franja[]): Promise<void>
}

export interface BloqueoRepository {
  /** Los que todavía no terminaron. */
  vigentes(ahora: string): Promise<Bloqueo[]>
  /** Los que pisan esos días (para dibujarlos en la agenda). */
  entre(desde: string, hasta: string): Promise<Bloqueo[]>
  /** Lo que pisa ese día, recortado al día. */
  ocupadoDelDia(fecha: string, tx?: Transaccion): Promise<Ocupado[]>
  crear(datos: Omit<Bloqueo, "id">): Promise<Bloqueo>
  /** false si no existía. */
  eliminar(id: number): Promise<boolean>
}

/** Un turno pedido que puede quedar afuera de un cambio de horario o de un día cerrado. */
export type TurnoPedido = {
  id: number
  fecha: string
  horaInicio: string
  horaFin: string
  servicio: string
  cliente: { nombre: string; apellido: string | null; telefono: string }
}

/** Lo que ocupa la agenda: los turnos que ya están tomados. */
export interface OcupacionDeAgenda {
  /**
   * Turnos que ocupan ese día (los de seña vencida no). `bloquear`: que nadie
   * tome un horario hasta que termine la transacción. `excluirTurnoId`: al
   * reprogramar, el horario del propio turno no cuenta.
   */
  turnosDelDia(fecha: string, opciones?: { tx?: Transaccion; bloquear?: boolean; excluirTurnoId?: number }): Promise<Ocupado[]>
  /** Turnos pedidos (reservados o confirmados) de ahora en adelante; opcionalmente solo los que pisan un rango. */
  pedidosFuturos(ahora: string, rango?: { desde: string; hasta: string }): Promise<TurnoPedido[]>
}

/** Valores de Turnos → Reglas. Los guarda la configuración del negocio. */
export interface ConfiguracionDeReservas {
  intervaloMin(): Promise<number>
  reglas(): Promise<ReglasReserva>
}

/** Lo que la agenda necesita de un servicio. Lo provee el catálogo. */
export interface ServiciosDeAgenda {
  duracion(servicioId: number, opciones: { incluirPausados: boolean }): Promise<number>
}
