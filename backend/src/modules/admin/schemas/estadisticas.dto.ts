/**
 * Lo que SALE de las estadísticas. Los nombres en inglés son los que esperan
 * los gráficos del panel (`DayStats` y `RankingApi` en frontend/admin).
 */
import type { Dia, ServicioHecho } from "../models/estadisticas.model.js"

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
