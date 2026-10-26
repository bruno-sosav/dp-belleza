/** Puertos de orders. Las implementaciones están en repositories/ (MySQL) e integrations/ (otros módulos). */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { EstadoPedido, FiltrosPedidos, Linea, NuevoPedido, Pedido, PedidoResumen, ProblemaDeCompra } from "./pedido.model.js"

/** Las tablas `pedidos` y `pedido_items`: el único lugar que las escribe. */
export interface PedidoRepository {
  /** Guarda el pedido y sus líneas. Devuelve el id. */
  crear(pedido: NuevoPedido, tx: Transaccion): Promise<number>
  /** Estado actual, bloqueando el pedido hasta el final de la transacción. null si no existe. */
  estadoParaCambiar(id: number, tx: Transaccion): Promise<EstadoPedido | null>
  cambiarEstado(id: number, estado: EstadoPedido, tx: Transaccion): Promise<void>
  /** Qué productos y cuántos lleva el pedido (para devolver el stock). */
  lineas(id: number, tx: Transaccion): Promise<Linea[]>
}

/** Lecturas para el panel: juntan el pedido con la clienta y los productos. */
export interface PedidosQueries {
  listar(filtros: FiltrosPedidos): Promise<PedidoResumen[]>
  detalle(id: number): Promise<Pedido | null>
}

/** Clientas: el módulo customers. */
export interface ClientesDePedidos {
  buscarOCrear(
    datos: { nombre: string; apellido?: string | null; telefono: string; email?: string | null },
    tx: Transaccion,
  ): Promise<number>
}

/** Precios: el módulo catalog. Solo los productos activos se pueden vender. */
export interface CatalogoDePedidos {
  vendibles(ids: number[], tx: Transaccion): Promise<Map<number, { nombre: string; precio: number }>>
}

/** Stock: el módulo inventory. */
export interface InventarioDePedidos {
  reservar(lineas: Linea[], tx: Transaccion): Promise<{ ok: true } | { ok: false; problemas: ProblemaDeCompra[] }>
  devolver(lineas: Linea[], tx: Transaccion): Promise<void>
}
