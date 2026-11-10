/**
 * Pedidos de la tienda. Dominio puro: tipos y reglas, sin base de datos ni HTTP.
 * El stock es del inventario, los precios del catálogo y la clienta de customers:
 * acá solo se arma el pedido con lo que ellos responden.
 */

export const ESTADOS_PEDIDO = ["pendiente", "confirmado", "entregado", "cancelado"] as const
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]

// A qué estados se puede pasar desde cada uno. "entregado" y "cancelado" son finales.
const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
}

export function puedeCambiarEstado(actual: EstadoPedido, nuevo: EstadoPedido): boolean {
  return TRANSICIONES[actual].includes(nuevo)
}

/**
 * El pago por Mercado Pago. null = el local no tiene Mercado Pago conectado y el
 * pago se coordina por WhatsApp; "pendiente" = la clienta todavía no pagó.
 */
export type PagoEstado = "pendiente" | "pagado" | null

/** La referencia que viaja en el pago para saber de qué pedido es. */
export const referenciaDePedido = (pedidoId: number) => `pedido-${pedidoId}`

/** Un pago como lo informa la pasarela, ya traducido. */
export type PagoDePedido = { id: number; aprobado: boolean; monto: number; referencia: string | null }

/** Lo que hace falta saber del pedido para aplicarle un pago. `giftCardMonto`: lo que ya cubrió una gift card. */
export type PedidoParaPagar = { id: number; clienteId: number; estado: EstadoPedido; pagoEstado: PagoEstado; total: number; giftCardMonto: number }

/** Lo que queda por pagar: el total menos lo que cubrió la gift card. */
export const aPagar = (p: { total: number; giftCardMonto: number }) => redondear(p.total - p.giftCardMonto)

/**
 * El pago puede llegar repetido (aviso y vuelta de la clienta) o tarde. Solo se
 * aplica uno aprobado, por el total, a un pedido que espera el pago. Si el pedido
 * sigue pendiente pasa a confirmado; si la dueña ya lo había confirmado o
 * cancelado, se respeta su estado (cancelado y pagado: hay que devolver la plata).
 */
export function resultadoDelPago(pedido: PedidoParaPagar, pago: Pick<PagoDePedido, "aprobado" | "monto">): { aplicar: false } | { aplicar: true; estado: EstadoPedido } {
  if (!pago.aprobado || pedido.pagoEstado !== "pendiente") return { aplicar: false }
  if (pago.monto + 0.01 < aPagar(pedido)) return { aplicar: false } // pagó de menos: no es este pedido
  return { aplicar: true, estado: pedido.estado === "pendiente" ? "confirmado" : pedido.estado }
}

/** Se puede (volver a) pagar mientras el pedido espere el pago y no esté cancelado. */
export const sePuedePagar = (p: Pick<PedidoParaPagar, "estado" | "pagoEstado">) => p.pagoEstado === "pendiente" && p.estado === "pendiente"

/** Cuántas unidades de un producto pide la clienta. */
export type Linea = { productoId: number; cantidad: number }

/** Una línea ya con el precio del catálogo, congelado al momento de la compra. */
export type LineaConPrecio = Linea & { nombre: string; precioUnitario: number }

/** Por qué no se puede comprar un producto. */
export type ProblemaDeCompra = { productoId: number; motivo: string }

/** Cómo recibe el pedido: retira en el local o se lo mandan (los datos del envío son de shipping). */
export type Entrega = "retiro" | "envio"

/** El envío de un pedido, como lo muestra el panel. */
export type EnvioDelPedido = {
  calle: string
  ciudad: string
  provincia: string
  codigoPostal: string
  costo: number
  plazoDias: number | null
  proveedor: "andreani" | "prueba"
  estado: "a_despachar" | "despachado" | "entregado"
  numeroSeguimiento: string | null
  despachadoAt: string | null
}

export type ClientePedido = { id: number; nombre: string; apellido: string | null; telefono: string; email: string | null }

/** Un pedido como lo lista el panel. */
export type PedidoResumen = {
  id: number
  estado: EstadoPedido
  pagoEstado: PagoEstado
  total: number
  notas: string | null
  unidades: number
  entrega: Entrega
  /** Solo si se envía. */
  envioEstado: EnvioDelPedido["estado"] | null
  cliente: ClientePedido
  creadoEn: string
  actualizadoEn: string
}

/** La gift card con que se pagó (todo o una parte). */
export type GiftCardDelPedido = { codigo: string; monto: number }

/** Un pedido con sus líneas. */
export type Pedido = Omit<PedidoResumen, "unidades" | "envioEstado"> & { items: LineaConPrecio[]; envio: EnvioDelPedido | null; giftCard: GiftCardDelPedido | null }

/** Lo que se guarda al confirmar la compra. */
export type NuevoPedido = {
  clienteId: number
  total: number
  notas: string | null
  lineas: LineaConPrecio[]
  /** Solo si se va a pagar por Mercado Pago. */
  pago: { token: string } | null
  /** Lo que cubre una gift card. Si cubre todo, el pedido nace pagado y confirmado. */
  giftCard: { id: number; monto: number } | null
}

export type FiltrosPedidos = { estado?: EstadoPedido; desde?: string; hasta?: string }

// Junta líneas repetidas del mismo producto en una sola, sumando cantidades.
export function agruparItems(items: Linea[]): Linea[] {
  const porProducto = new Map<number, number>()
  for (const { productoId, cantidad } of items) {
    porProducto.set(productoId, (porProducto.get(productoId) ?? 0) + cantidad)
  }
  return [...porProducto].map(([productoId, cantidad]) => ({ productoId, cantidad }))
}

// Redondea a 2 decimales para evitar errores de punto flotante en los totales.
export const redondear = (n: number) => Math.round(n * 100) / 100

export const subtotal = (l: Pick<LineaConPrecio, "cantidad" | "precioUnitario">) => redondear(l.precioUnitario * l.cantidad)

export const totalDe = (lineas: LineaConPrecio[]) => redondear(lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0))
