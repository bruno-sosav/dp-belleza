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

/** Cuántas unidades de un producto pide la clienta. */
export type Linea = { productoId: number; cantidad: number }

/** Una línea ya con el precio del catálogo, congelado al momento de la compra. */
export type LineaConPrecio = Linea & { nombre: string; precioUnitario: number }

/** Por qué no se puede comprar un producto. */
export type ProblemaDeCompra = { productoId: number; motivo: string }

export type ClientePedido = { id: number; nombre: string; apellido: string | null; telefono: string; email: string | null }

/** Un pedido como lo lista el panel. */
export type PedidoResumen = {
  id: number
  estado: EstadoPedido
  total: number
  notas: string | null
  unidades: number
  cliente: ClientePedido
  creadoEn: string
  actualizadoEn: string
}

/** Un pedido con sus líneas. */
export type Pedido = Omit<PedidoResumen, "unidades"> & { items: LineaConPrecio[] }

/** Lo que se guarda al confirmar la compra. */
export type NuevoPedido = { clienteId: number; total: number; notas: string | null; lineas: LineaConPrecio[] }

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
