/**
 * Cálculos de las estadísticas del panel: ganancias por día, rankings y
 * comparaciones. Trabaja sobre admin/data/history.ts.
 *
 * Ganancia = ventas de la tienda + turnos completados (los cancelados y
 * ausentes no suman plata, pero se cuentan aparte).
 */
import { bookings, fromDateKey, HISTORY_DAYS, orders, toDateKey } from "../data/history"

export type Period = 7 | 30 | 90

export const periodOptions: { value: Period; label: string }[] = [
  { value: 7, label: "Últimos 7 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 90, label: "Últimos 90 días" },
]

export type DayStats = {
  date: string
  weekday: number
  /** Plata de la tienda (pedidos). */
  shop: number
  /** Plata de los turnos completados. */
  services: number
  total: number
  orderCount: number
  /** Turnos realizados (completados). */
  bookingCount: number
  cancelledCount: number
}

export type DayMetric = "total" | "bookingCount"

export const metricLabels: Record<DayMetric, { short: string; unit: (n: number) => string }> = {
  total: { short: "Ganancia", unit: (n) => `$ ${n.toLocaleString("es-AR")}` },
  bookingCount: { short: "Turnos", unit: (n) => `${n} ${n === 1 ? "turno" : "turnos"}` },
}

function buildDays(): DayStats[] {
  const byDate = new Map<string, DayStats>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const d = new Date(today)
    d.setDate(today.getDate() - daysAgo)
    const date = toDateKey(d)
    byDate.set(date, { date, weekday: d.getDay(), shop: 0, services: 0, total: 0, orderCount: 0, bookingCount: 0, cancelledCount: 0 })
  }

  for (const o of orders) {
    const day = byDate.get(o.date)
    if (!day) continue
    day.shop += o.total
    day.orderCount += 1
  }
  for (const b of bookings) {
    const day = byDate.get(b.date)
    if (!day) continue
    if (b.status === "completado") {
      day.services += b.price
      day.bookingCount += 1
    } else if (b.status === "cancelado") {
      day.cancelledCount += 1
    }
  }
  for (const day of byDate.values()) day.total = day.shop + day.services

  return [...byDate.values()]
}

const allDays = buildDays()

/** Los días del período elegido, del más viejo al más nuevo (termina hoy). */
export function daysInPeriod(period: Period) {
  return allDays.slice(-period)
}

/** El período anterior del mismo largo, para comparar. */
export function previousPeriodDays(period: Period) {
  return allDays.slice(-2 * period, -period)
}

export function totals(days: DayStats[]) {
  return days.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      shop: acc.shop + d.shop,
      services: acc.services + d.services,
      orderCount: acc.orderCount + d.orderCount,
      bookingCount: acc.bookingCount + d.bookingCount,
      cancelledCount: acc.cancelledCount + d.cancelledCount,
    }),
    { total: 0, shop: 0, services: 0, orderCount: 0, bookingCount: 0, cancelledCount: 0 },
  )
}

/** Variación porcentual; null si no hay base para comparar. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function datesOf(days: DayStats[]) {
  return new Set(days.map((d) => d.date))
}

export type RankingRow = { id: string; count: number; revenue: number }

/** Productos más vendidos en esos días (por unidades). */
export function topProducts(days: DayStats[]): RankingRow[] {
  const dates = datesOf(days)
  const rows = new Map<string, RankingRow>()
  for (const o of orders) {
    if (!dates.has(o.date)) continue
    for (const it of o.items) {
      const row = rows.get(it.productId) ?? { id: it.productId, count: 0, revenue: 0 }
      row.count += it.quantity
      row.revenue += it.quantity * it.unitPrice
      rows.set(it.productId, row)
    }
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue)
}

/** Servicios más reservados en esos días (turnos completados). */
export function topServices(days: DayStats[]): RankingRow[] {
  const dates = datesOf(days)
  const rows = new Map<string, RankingRow>()
  for (const b of bookings) {
    if (!dates.has(b.date) || b.status !== "completado") continue
    const row = rows.get(b.serviceId) ?? { id: b.serviceId, count: 0, revenue: 0 }
    row.count += 1
    row.revenue += b.price
    rows.set(b.serviceId, row)
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue)
}

/** Servicios que se hicieron un día puntual. */
export function servicesOnDay(date: string) {
  return topServices(allDays.filter((d) => d.date === date))
}

/** Días ordenados del más movido al más tranquilo. */
export function busiestDays(days: DayStats[], metric: DayMetric) {
  return [...days].filter((d) => d[metric] > 0).sort((a, b) => b[metric] - a[metric])
}

/** Puesto del día dentro del período (1 = el más movido). */
export function rankOfDay(day: DayStats, days: DayStats[], metric: DayMetric) {
  return days.filter((d) => d[metric] > day[metric]).length + 1
}

/** El mismo día de la semana anterior (ej: el lunes anterior). */
export function sameDayLastWeek(day: DayStats) {
  const d = fromDateKey(day.date)
  d.setDate(d.getDate() - 7)
  return allDays.find((x) => x.date === toDateKey(d))
}

/** Promedio por día de la semana, de lunes a sábado (domingo cerrado). */
export function weekdayAverages(days: DayStats[], metric: DayMetric) {
  const order = [1, 2, 3, 4, 5, 6]
  return order.map((weekday) => {
    const matching = days.filter((d) => d.weekday === weekday)
    const sum = matching.reduce((acc, d) => acc + d[metric], 0)
    return { weekday, average: matching.length ? sum / matching.length : 0 }
  })
}
