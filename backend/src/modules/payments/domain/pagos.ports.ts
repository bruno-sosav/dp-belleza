/**
 * Puertos de pagos. Los de este módulo (cobros, cuenta, pagos recibidos) se
 * implementan con MySQL; la pasarela, con la API de Mercado Pago. Los turnos
 * se conectan desde su módulo (TurnosDeLaCaja), así pagos no depende de turnos.
 */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Cobro, MedioPago, NuevoCobro } from "./cobro.model.js"
import type { CuentaMercadoPago, ModoCuenta, PagoRecibido, ResumenCuenta } from "./mercadoPago.model.js"

export interface CobroRepository {
  /** Con `mpPagoId` repetido no hace nada. Devuelve el id, o null si ya estaba. */
  registrar(c: NuevoCobro, tx?: Transaccion): Promise<number | null>
  porId(id: number): Promise<Cobro | null>
  borrar(id: number): Promise<void>
  /** Lo cobrado al terminar un turno (no la seña): se usa al deshacer un "completado". */
  anularDelTurno(turnoId: number, tx: Transaccion): Promise<void>
  /** Cuánto entró por cada turno (seña + lo cobrado al terminar). */
  cobradoPorTurnos(turnoIds: number[]): Promise<Map<number, number>>
  /** Unir dos fichas de clienta: sus cobros pasan a la que queda. */
  reasignarCliente(deId: number, aId: number, tx: Transaccion): Promise<void>
}

/** Un cobro como lo muestra la caja: con el turno y la clienta a la vista. */
export type CobroEnCaja = Cobro & {
  turno: { id: number; servicio: string; fecha: string; hora: string } | null
  cliente: { nombre: string } | null
}

/** Un turno completado ese día que todavía no se cobró entero. */
export type TurnoSinCobrar = { turnoId: number; hora: string; servicio: string; cliente: { nombre: string }; precio: number; cobrado: number }

/** Vistas de lectura de la caja: juntan tablas de turnos y clientas para no hacer un pedido por fila. */
export interface ConsultasDeCaja {
  delDia(fecha: string): Promise<CobroEnCaja[]>
  sinCobrar(fecha: string): Promise<TurnoSinCobrar[]>
}

export interface CuentaRepository {
  leer(): Promise<CuentaMercadoPago | null>
  resumen(): Promise<ResumenCuenta | null>
  /** `webhookSecret` null: se conserva el que había. */
  guardar(c: { accessToken: string; publicKey: string; webhookSecret: string | null; modo: ModoCuenta; cuenta: string }): Promise<void>
  marcarVerificada(modo: ModoCuenta, cuenta: string): Promise<void>
  borrar(): Promise<void>
}

/** Registro de cada pago que avisó Mercado Pago (para auditoría y para "¿se pagó?"). */
export interface PagosRecibidosRepository {
  guardar(pago: PagoRecibido, datos: unknown): Promise<void>
  ultimoEstado(referencia: string): Promise<string | null>
}

export interface PasarelaDePago {
  /** A qué cuenta pertenece un token (para validar credenciales antes de guardarlas). */
  usuario(accessToken: string): Promise<{ nickname: string; email: string | null }>
  crearLink(
    cuenta: CuentaMercadoPago,
    d: {
      items: { titulo: string; cantidad: number; precioUnitario: number }[]
      referencia: string
      vuelta?: { exito: string; pendiente: string; error: string }
      notificacion?: string
    },
  ): Promise<string>
  /** El pago traducido y, aparte, lo que mandó la pasarela tal cual (para guardarlo). */
  consultarPago(cuenta: CuentaMercadoPago, id: string | number): Promise<{ pago: PagoRecibido; datos: unknown }>
}

/** Lo que pagos necesita de los turnos. Lo conecta el módulo de turnos (`pagos.conectarTurnos`). */
export interface TurnosDeLaCaja {
  clienteDelTurno(turnoId: number, tx: Transaccion): Promise<number | null>
  /** Llegó un pago con referencia "turno-<id>": la seña. */
  aplicarPagoSena(turnoId: number, pago: PagoRecibido): Promise<void>
}

export type { MedioPago }
