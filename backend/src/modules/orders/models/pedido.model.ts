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

// Junta líneas repetidas del mismo producto en una sola, sumando cantidades.
export function agruparItems(items: { productoId: number; cantidad: number }[]) {
  const porProducto = new Map<number, number>()
  for (const { productoId, cantidad } of items) {
    porProducto.set(productoId, (porProducto.get(productoId) ?? 0) + cantidad)
  }
  return [...porProducto].map(([productoId, cantidad]) => ({ productoId, cantidad }))
}

// Redondea a 2 decimales para evitar errores de punto flotante en los totales.
export const redondear = (n: number) => Math.round(n * 100) / 100
