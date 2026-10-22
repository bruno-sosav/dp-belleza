/**
 * Puertos de admin. Los ajustes y las estadísticas se leen con MySQL; Mercado
 * Pago (para lo que ve la web) viene de pagos. Las clientas se conectan desde
 * su módulo (`ajustes.conectarTelefonos`), así admin no depende de nadie que
 * dependa de él.
 */
import type { Ajustes, ClaveAjuste } from "./ajustes.model.js"
import type { MovimientoDelDia, ServicioHecho } from "./estadisticas.model.js"

export interface AjustesRepository {
  /** Las claves que existen (las desconocidas no). */
  leer(): Promise<Ajustes>
  /** Todo junto: o se guardan todos, o ninguno. */
  guardar(cambios: Partial<Record<ClaveAjuste, string>>): Promise<void>
}

/** Vistas de lectura sobre turnos y servicios (de otros módulos). */
export interface ConsultasDeEstadisticas {
  movimientoPorDia(desde: string, hasta: string): Promise<MovimientoDelDia[]>
  serviciosHechos(desde: string, hasta: string): Promise<ServicioHecho[]>
  serviciosDelDia(fecha: string): Promise<ServicioHecho[]>
}

/** De pagos: lo que la web necesita saber de Mercado Pago. */
export interface MercadoPagoDelLocal {
  conectado(): Promise<boolean>
  publicKey(): Promise<string | null>
}
