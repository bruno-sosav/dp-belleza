/** Puertos de orders. Las implementaciones están en repositories/ (MySQL) e integrations/ (otros módulos). */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type {
  EstadoPedido,
  FiltrosPedidos,
  Linea,
  LineaConPrecio,
  NuevoPedido,
  PagoDePedido,
  Pedido,
  PedidoParaPagar,
  PedidoResumen,
  ProblemaDeCompra,
} from "./pedido.model.js"

/** Las tablas `pedidos` y `pedido_items`: el único lugar que las escribe. */
export interface PedidoRepository {
  /** Guarda el pedido y sus líneas. Devuelve el id. */
  crear(pedido: NuevoPedido, tx: Transaccion): Promise<number>
  /** Estado actual, bloqueando el pedido hasta el final de la transacción. null si no existe. */
  estadoParaCambiar(id: number, tx: Transaccion): Promise<EstadoPedido | null>
  cambiarEstado(id: number, estado: EstadoPedido, tx: Transaccion): Promise<void>
  /** Qué productos y cuántos lleva el pedido (para devolver el stock). */
  lineas(id: number, tx: Transaccion): Promise<Linea[]>
  /** Lo necesario para cobrarlo. Con `tx` lo bloquea hasta el final de la transacción. */
  paraPagar(id: number, tx?: Transaccion): Promise<PedidoParaPagar | null>
  /** El id del pedido de ese link de pago, o null si no existe. */
  idPorToken(token: string): Promise<number | null>
  marcarPagado(id: number, pagoId: number, estado: EstadoPedido, tx: Transaccion): Promise<void>
  /** La gift card con que se pagó una parte (para devolverle el saldo si se cancela). */
  giftCardDelPedido(id: number, tx: Transaccion): Promise<{ id: number; monto: number } | null>
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

/** Mercado Pago: el módulo payments. */
export interface PasarelaDePedidos {
  conectada(): Promise<boolean>
  crearLink(d: { pedidoId: number; token: string; lineas: LineaConPrecio[] }): Promise<string>
  consultarPago(id: string): Promise<PagoDePedido>
}

/** La caja: el módulo payments. Lo pagado por Mercado Pago entra solo. */
export interface CajaDePedidos {
  cobrar(c: { pedidoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion): Promise<void>
}

/** Envíos: el módulo shipping. */
export type DireccionDeEnvio = { calle: string; ciudad: string; provincia: string; codigoPostal: string }
export type CotizacionDeEnvio = { costo: number; plazoDias: number | null; gratis: boolean; proveedor: "andreani" | "prueba" }
export interface EnviosDePedidos {
  cotizar(d: { codigoPostal: string; unidades: number; subtotal: number }): Promise<CotizacionDeEnvio>
  registrar(pedidoId: number, destino: DireccionDeEnvio, c: CotizacionDeEnvio, tx: Transaccion): Promise<void>
  despachar(d: { pedidoId: number; estadoPedido: string; destinatario: { nombre: string; telefono: string; email: string | null }; unidades: number; valor: number }): Promise<unknown>
  seguimiento(pedidoId: number): Promise<{ fecha: string; estado: string; detalle: string | null }[]>
  marcarEntregado(pedidoId: number, tx: Transaccion): Promise<void>
}

/** Gift cards: el módulo giftcards. */
export interface GiftCardsDePedidos {
  /** Bloquea la gift card y dice cuánto se descuenta de una compra de `total`. Falla si no existe o no tiene saldo. */
  reservar(codigo: string, total: number, tx: Transaccion): Promise<{ id: number; monto: number }>
  descontar(id: number, monto: number, pedidoId: number, tx: Transaccion): Promise<void>
  reintegrar(id: number, monto: number, pedidoId: number, tx: Transaccion): Promise<void>
}

/** Stock: el módulo inventory. */
export interface InventarioDePedidos {
  reservar(lineas: Linea[], tx: Transaccion): Promise<{ ok: true } | { ok: false; problemas: ProblemaDeCompra[] }>
  devolver(lineas: Linea[], tx: Transaccion): Promise<void>
}
