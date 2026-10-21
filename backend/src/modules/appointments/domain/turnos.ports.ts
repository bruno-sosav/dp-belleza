/**
 * Puertos de los turnos. Los de este módulo (repositorio, consultas) se
 * implementan con MySQL en infrastructure/; los que miran hacia otros módulos
 * (clientas, catálogo, pagos, caja, configuración) son
 * adaptadores a lo que esos módulos exportan.
 */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { EstadoTurno } from "./estados.model.js"
import type { PagoDeSena } from "./sena.model.js"
import type { CanceladoPor, EstadoSena, Turno } from "./turno.model.js"

export type NuevoTurno = {
  clienteId: number
  servicioId: number
  fecha: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurno
  precio: number
  notas: string | null
  /** Solo web con seña: nace esperando el pago, con plazo de `venceEnMinutos`. */
  sena: { monto: number; token: string; venceEnMinutos: number } | null
  /** Solo web: identifica la reserva en la URL de la confirmación. */
  tokenPublico: string | null
}

export type CambiosTurno = Partial<{
  servicioId: number
  precio: number
  fecha: string
  horaInicio: string
  horaFin: string
  notas: string | null
  estado: EstadoTurno
  canceladoPor: CanceladoPor | null
  senaEstado: EstadoSena
  senaPagoId: number
}>

export interface TurnoRepository {
  /** `bloquear`: que nadie más lo cambie hasta que termine la transacción. */
  porId(id: number, tx?: Transaccion, opciones?: { bloquear?: boolean }): Promise<Turno | null>
  porTokenDeSena(token: string): Promise<(Turno & { senaVencida: boolean }) | null>
  crear(datos: NuevoTurno, tx: Transaccion): Promise<number>
  actualizar(id: number, cambios: CambiosTurno, tx?: Transaccion): Promise<void>
  /** Turnos pedidos (a futuro) de una clienta: para el tope de la web. */
  pedidosFuturosDeCliente(clienteId: number, tx: Transaccion): Promise<number>
  /** Cancela los turnos cuya seña venció sin pagar. Devuelve cuántos. */
  vencerSenas(): Promise<number>
}

// ---------------------------------------------------------------- vistas (lo que se muestra)

/** Un turno como lo ve el panel: con la clienta, el servicio y lo cobrado. */
export type TurnoDelPanel = Turno & {
  servicio: { id: number; nombre: string; duracionMin: number }
  cliente: { id: number; nombre: string; apellido: string | null; telefono: string }
  /** Lo que ya entró a la caja por este turno (seña + lo cobrado al terminar). */
  cobrado: number
}

/** Un turno como lo ve la clienta en la web. */
export type TurnoDeLaClienta = Turno & {
  servicio: { id: number; nombre: string; duracionMin: number; profesional: string | null }
  cliente: { nombre: string; apellido: string | null; telefono: string; email: string | null }
  senaVenceA: string | null
}

export interface ConsultasDeTurnos {
  delPanel(id: number): Promise<TurnoDelPanel | null>
  delPanelEntre(desde: string, hasta: string, estado?: EstadoTurno): Promise<TurnoDelPanel[]>
  porTokenPublico(token: string): Promise<TurnoDeLaClienta | null>
  porTokenDeSena(token: string): Promise<TurnoDeLaClienta | null>
  /** Mi turno: solo si el código Y el teléfono coinciden. */
  deLaClienta(id: number, telefono: string, tx?: Transaccion, opciones?: { bloquear?: boolean }): Promise<TurnoDeLaClienta | null>
}

// ---------------------------------------------------------------- otros módulos

export type EntradaClienta = {
  nombre: string
  apellido?: string | null
  telefono: string
  email?: string | null
  cumple?: { dia: number; mes: number } | null
}

/** De clientas (customers). */
export interface ClientesDeTurnos {
  buscarOCrear(datos: EntradaClienta, tx: Transaccion): Promise<number>
  existe(id: number, tx: Transaccion): Promise<boolean>
  normalizarTelefono(texto: string): Promise<string | null>
  separarNombreCompleto(texto: string): { nombre: string; apellido: string | null }
}

/** Del catálogo: lo que la agenda necesita de un servicio. */
export interface ServiciosDeTurnos {
  reservable(id: number, opciones?: { incluirPausados?: boolean }): Promise<{ id: number; nombre: string; precio: number; duracionMin: number }>
}

/** De pagos (payments): Mercado Pago. */
export interface PasarelaDeSenas {
  /** Si está conectada (sin pasarela no se cobra seña). */
  conectada(): Promise<boolean>
  crearLink(datos: { turnoId: number; servicio: string; fecha: string; hora: string; monto: number; token: string }): Promise<string>
  consultarPago(id: string): Promise<PagoDeSena>
}

/** De la caja (payments). */
export interface CajaDeTurnos {
  cobrarTurno(c: { turnoId: number; clienteId: number; monto: number; medio: string }, tx: Transaccion): Promise<void>
  cobrarSena(c: { turnoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion): Promise<void>
  /** Deshacer un "completado": lo cobrado al terminar sale de la caja (la seña no). */
  anularCobroDelTurno(turnoId: number, tx: Transaccion): Promise<void>
  /** Cuánto entró por cada turno (seña + lo cobrado al terminar). */
  cobradoPorTurnos(turnoIds: number[]): Promise<Map<number, number>>
}

/** De la configuración del negocio (admin). */
export interface ConfiguracionDeTurnos {
  porcentajeSena(): Promise<number>
  horasParaCancelar(): Promise<number>
}

/**
 * Lo que los turnos ANUNCIAN a quien se anote (recordatorios, por ejemplo),
 * sin conocerlo: así ningún módulo de los que escuchan queda en círculo.
 */
export interface AvisosDeTurnos {
  /** Se movió de día u hora un turno pedido. Corre dentro de la transacción. */
  reprogramado(turnoId: number, tx: Transaccion): Promise<void>
}
