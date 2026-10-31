/** Puertos de admin. Clientas se conectan desde su módulo para no crear dependencia circular. */
import type { Ajustes, ClaveAjuste } from "./ajustes.model.js"
import type { MovimientoDelDia, ProductoVendido, ServicioHecho, VentaDelDia } from "./estadisticas.model.js"

export interface AjustesRepository {
  /** Las claves que existen (las desconocidas no). */
  leer(): Promise<Ajustes>
  /** Todo junto: o se guardan todos, o ninguno. */
  guardar(cambios: Partial<Record<ClaveAjuste, string>>): Promise<void>
}

/** Vistas de lectura sobre turnos, servicios y pedidos (de otros módulos). */
export interface ConsultasDeEstadisticas {
  movimientoPorDia(desde: string, hasta: string): Promise<MovimientoDelDia[]>
  /** Plata y cantidad de pedidos de la tienda por día (solo los que cuentan como venta). */
  ventasPorDia(desde: string, hasta: string): Promise<VentaDelDia[]>
  /** Productos vendidos en el período, de más a menos unidades. */
  productosVendidos(desde: string, hasta: string): Promise<ProductoVendido[]>
  serviciosHechos(desde: string, hasta: string): Promise<ServicioHecho[]>
  serviciosDelDia(fecha: string): Promise<ServicioHecho[]>
}

/** De pagos: lo que la web necesita saber de Mercado Pago. */
export interface MercadoPagoDelLocal {
  conectado(): Promise<boolean>
  publicKey(): Promise<string | null>
}
