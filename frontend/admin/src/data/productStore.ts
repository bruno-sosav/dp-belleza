/**
 * Productos del panel.
 *
 * MOCK, y con una limitación importante: los cambios se guardan en el
 * localStorage de ESTE navegador y de ESTE dominio. El panel vive en
 * admin.dpbelleza.com.ar y la web en dpbelleza.com.ar, y el navegador aísla el
 * almacenamiento por origen: **un producto agregado acá no aparece en la web.**
 *
 * No es algo que se pueda arreglar desde el frontend. El canal entre el panel y
 * la web es la base de datos, que todavía no existe. Cuando exista la API, este
 * archivo se reemplaza por:
 *
 *    useAllProducts()            -> GET    /api/admin/productos
 *    addProduct(input)           -> POST   /api/admin/productos
 *    setProductActive(id, bool)  -> PATCH  /api/admin/productos/:id
 *
 * y las pantallas no cambian.
 */
import { useMemo, useSyncExternalStore } from "react"
import { initialProducts } from "@dp/shared/data/products"
import type { Product } from "@dp/shared/data/products"

const STORAGE_KEY = "dp-belleza:admin-products"

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
  // Si el panel está abierto en otra pestaña, se sincroniza.
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

/** Todos los productos, incluidos los dados de baja. */
export function useAllProducts() {
  return useSyncExternalStore(subscribe, () => products)
}

/** Solo los activos (lo que la web mostraría). */
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
