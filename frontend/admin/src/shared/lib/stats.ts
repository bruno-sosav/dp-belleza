/**
 * Cuentas sobre la serie diaria que ya agregó el backend: cortar período, comparar, rankear días.
 * Ganancia = tienda + turnos completados (cancelados y ausentes no suman).
 */

import { fromDateKey, toDateKey } from "./fechas"

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
  /** La clienta no vino sin avisar (estado `ausente`). */
  noShowCount: number
}

export type DayMetric = "total" | "bookingCount"

export const metricLabels: Record<DayMetric, { short: string; unit: (n: number) => string }> = {
  total: { short: "Ganancia", unit: (n) => `$ ${n.toLocaleString("es-AR")}` },
  bookingCount: { short: "Turnos", unit: (n) => `${n} ${n === 1 ? "turno" : "turnos"}` },
}

/** Los días del período elegido, del más viejo al más nuevo (termina hoy). */
export function daysInPeriod(allDays: DayStats[], period: Period) {
  return allDays.slice(-period)
}

/** El período anterior del mismo largo, para comparar. */
export function previousPeriodDays(allDays: DayStats[], period: Period) {
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
      noShowCount: acc.noShowCount + d.noShowCount,
    }),
    { total: 0, shop: 0, services: 0, orderCount: 0, bookingCount: 0, cancelledCount: 0, noShowCount: 0 },
  )
}

/** Variación porcentual; null si no hay base para comparar. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
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
export function sameDayLastWeek(allDays: DayStats[], day: DayStats) {
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
