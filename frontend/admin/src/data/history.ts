/**
 * MOCK DATA — Historial de ventas y turnos para las estadísticas del panel.
 *
 * Mientras no haya backend se generan 6 meses de datos de demostración. Las formas
 * copian las tablas de la base (pedidos + pedido_items, turnos), así que cuando
 * exista la API alcanza con reemplazar este archivo por las llamadas reales.
 *
 * Los datos son deterministas: cada día se genera a partir de su fecha, así que
 * recargar la página no cambia los números.
 */
import { initialProducts } from "../../ecommerce/data/products"
import { services } from "../../turnera/data/services"

export type OrderItem = { productId: string; quantity: number; unitPrice: number }
export type Order = { id: string; date: string; items: OrderItem[]; total: number }

export type BookingStatus = "completado" | "cancelado" | "ausente"
export type Booking = { id: string; date: string; time: string; serviceId: string; price: number; status: BookingStatus }

export const HISTORY_DAYS = 180

/** 2026-09-22 (fecha local, sin corrimiento de zona horaria). */
export function toDateKey(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Generador pseudoaleatorio con semilla (mulberry32) para que los datos sean estables.
function seededRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function pickWeighted<T>(items: T[], weights: number[], rand: () => number) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// Promedio de turnos y pedidos por día de la semana (0 = domingo). El domingo el local está cerrado.
const bookingsByWeekday = [0, 9, 7, 8, 10, 13, 15]
const ordersByWeekday = [4, 5, 4, 5, 6, 8, 7]
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"]

function generate() {
  const orders: Order[] = []
  const bookings: Booking[] = []

  const productWeights = initialProducts.map((p) =>
    p.badge === "Bestseller" ? 4 : p.badge === "Oferta" ? 2.5 : p.badge === "Nuevo" ? 2 : 1,
  )
  const serviceWeights = services.map((s) => (s.badge === "Más elegido" ? 4 : s.badge ? 2 : 1))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const day = new Date(today)
    day.setDate(today.getDate() - daysAgo)
    const date = toDateKey(day)
    const rand = seededRandom(hashString(date))
    const weekday = day.getDay()

    // El negocio crece de a poco en el semestre, y algunos días puntuales explotan (fechas especiales, promos).
    const growth = 0.85 + 0.3 * (1 - daysAgo / HISTORY_DAYS)
    const busyDay = rand() < 0.07 ? 1.7 : 1

    const bookingCount = Math.round(bookingsByWeekday[weekday] * growth * busyDay * (0.7 + rand() * 0.6))
    for (let i = 0; i < bookingCount; i++) {
      const service = pickWeighted(services, serviceWeights, rand)
      const roll = rand()
      bookings.push({
        id: `${date}-t${i}`,
        date,
        time: timeSlots[Math.floor(rand() * timeSlots.length)],
        serviceId: service.id,
        price: service.price,
        status: roll < 0.88 ? "completado" : roll < 0.95 ? "cancelado" : "ausente",
      })
    }

    const orderCount = Math.round(ordersByWeekday[weekday] * growth * (busyDay > 1 ? 1.3 : 1) * (0.6 + rand() * 0.8))
    for (let i = 0; i < orderCount; i++) {
      const lines = 1 + Math.floor(rand() * 2.4)
      const items: OrderItem[] = []
      for (let j = 0; j < lines; j++) {
        const product = pickWeighted(initialProducts, productWeights, rand)
        if (items.some((it) => it.productId === product.id)) continue
        items.push({ productId: product.id, quantity: rand() < 0.8 ? 1 : 2, unitPrice: product.price })
      }
      orders.push({
        id: `${date}-p${i}`,
        date,
        items,
        total: items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
      })
    }
  }

  return { orders, bookings }
}

export const { orders, bookings } = generate()
