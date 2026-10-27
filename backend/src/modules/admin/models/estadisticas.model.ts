/**
 * Rango y serie diaria con días vacíos (los totales salen de SQL).
 * Días de la semana: la serie usa JS (0 = domingo); MySQL DAYOFWEEK es 1 = domingo y horarios_atencion ISO.
 */

/** Un día de la serie. */
export type Dia = {
  fecha: string
  /** 0 = domingo ... 6 = sábado. */
  diaSemana: number
  /** Plata de los turnos completados (precio congelado de cada uno). */
  servicios: number
  /** Plata de la tienda: pedidos confirmados o entregados (los pendientes todavía no se cobraron). */
  tienda: number
  pedidos: number
  realizados: number
  cancelados: number
  /** "No vino" sin avisar. */
  ausentes: number
}

/** Lo que dice la base de un día con movimiento. */
export type MovimientoDelDia = { fecha: string; ganancia: number; realizados: number; cancelados: number; ausentes: number }

/** Lo que dice la base de las ventas de la tienda de un día. */
export type VentaDelDia = { fecha: string; ventas: number; pedidos: number }

/** Un servicio en el ranking del período. */
export type ServicioHecho = { id: number; nombre: string; cantidad: number; ganancia: number }

/** Un producto en el ranking del período: unidades vendidas y plata. `activo: false` = dado de baja. */
export type ProductoVendido = { id: number; nombre: string; cantidad: number; ganancia: number; activo: boolean }

/** Los estados de pedido que cuentan como venta: un pendiente no se cobró y un cancelado no se vendió. */
export const ESTADOS_DE_VENTA = ["confirmado", "entregado"] as const

const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`

/** [desde, hasta) terminando hoy inclusive: `hasta` es mañana. */
export function rango(hoy: string, dias: number): { desde: string; hasta: string } {
  const [y, m, d] = hoy.split("-").map(Number)
  return { desde: fmt(new Date(y, m - 1, d - dias + 1)), hasta: fmt(new Date(y, m - 1, d + 1)) }
}

/** Serie completa con los días sin movimiento en 0, para que no desaparezcan del eje. */
export function serieDiaria(hoy: string, dias: number, movimientos: MovimientoDelDia[], ventas: VentaDelDia[] = []): Dia[] {
  const [y, m, d] = hoy.split("-").map(Number)
  const porFecha = new Map(movimientos.map((x) => [x.fecha, x]))
  const ventasPorFecha = new Map(ventas.map((x) => [x.fecha, x]))
  const serie: Dia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = new Date(y, m - 1, d - i)
    const mov = porFecha.get(fmt(fecha))
    const venta = ventasPorFecha.get(fmt(fecha))
    serie.push({
      fecha: fmt(fecha),
      diaSemana: fecha.getDay(),
      servicios: mov?.ganancia ?? 0,
      tienda: venta?.ventas ?? 0,
      pedidos: venta?.pedidos ?? 0,
      realizados: mov?.realizados ?? 0,
      cancelados: mov?.cancelados ?? 0,
      ausentes: mov?.ausentes ?? 0,
    })
  }
  return serie
}
