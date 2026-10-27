/** Nombres en inglés: los que esperan los gráficos del panel (DayStats, RankingApi). */
import type { Dia, ProductoVendido, ServicioHecho } from "../models/estadisticas.model.js"

export const aDia = (d: Dia) => ({
  date: d.fecha,
  weekday: d.diaSemana,
  shop: d.tienda,
  services: d.servicios,
  total: d.tienda + d.servicios,
  orderCount: d.pedidos,
  bookingCount: d.realizados,
  cancelledCount: d.cancelados,
  noShowCount: d.ausentes,
})

export const aServicioHecho = (s: ServicioHecho) => ({ id: s.id, name: s.nombre, count: s.cantidad, revenue: s.ganancia })

/** Mismo formato que el ranking de servicios, más `inactive` para marcar los dados de baja. */
export const aProductoVendido = (p: ProductoVendido) => ({ id: p.id, name: p.nombre, count: p.cantidad, revenue: p.ganancia, inactive: !p.activo })
