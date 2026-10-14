/**
 * Store de productos compartido entre la tienda y el panel de administración.
 *
 * MOCK: mientras no haya backend, los cambios se guardan en el localStorage del
 * navegador (solo se ven en esta compu). Cuando exista la API, se reemplazan las
 * funciones de este archivo por llamadas HTTP y las pantallas no cambian.
 */
import { useMemo, useSyncExternalStore } from "react"
import { initialProducts } from "./products"
import type { Product } from "./products"

const STORAGE_KEY = "dp-belleza:products"

export type NewProduct = Omit<Product, "id" | "rating" | "reviews" | "active">

function load(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as Product[]
  } catch {
    // localStorage bloqueado o JSON inválido: se usa el catálogo inicial.
  }
  return initialProducts
}

let products: Product[] = load()
const listeners = new Set<() => void>()

function commit(next: Product[]) {
  products = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sin persistencia: el cambio vale solo hasta recargar la página.
  }
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Si el panel está abierto en otra pestaña, la tienda se actualiza sola.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    products = load()
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Todos los productos, incluidos los dados de baja (para el panel). */
export function useAllProducts() {
  return useSyncExternalStore(subscribe, () => products)
}

/** Solo los productos activos (lo que ve la clienta en la web). */
export function useProducts() {
  const all = useAllProducts()
  return useMemo(() => all.filter((p) => p.active), [all])
}

export function addProduct(input: NewProduct): Product {
  const nextNumber = Math.max(0, ...products.map((p) => Number(p.id.replace(/\D/g, "")) || 0)) + 1
  const product: Product = { ...input, id: `p${nextNumber}`, rating: 0, reviews: 0, active: true }
  commit([...products, product])
  return product
}

/** Dar de baja (false) o reactivar (true). Nunca se borra el producto. */
export function setProductActive(id: string, active: boolean) {
  commit(products.map((p) => (p.id === id ? { ...p, active } : p)))
}
