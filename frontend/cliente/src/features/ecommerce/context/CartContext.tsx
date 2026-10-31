import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Producto } from "@dp/shared/types/producto.types"

export type CartItem = {
  product: Producto
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (product: Producto, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  /** Vacía el carrito (después de comprar). */
  clear: () => void
  /** Con los precios de cuando se agregó cada producto: el total real lo calcula el backend al comprar. */
  subtotal: number
  count: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

// El carrito sobrevive a recargar la página. Si el navegador no deja guardar, arranca vacío.
const STORAGE_KEY = "dp-carrito"

function cargarGuardado(): CartItem[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(guardado) ? guardado.filter((i) => typeof i?.product?.id === "number" && i.quantity > 0) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(cargarGuardado)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Sin almacenamiento (modo privado): el carrito igual funciona mientras la página esté abierta.
    }
  }, [items])

  const addItem = (product: Producto, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i))
      }
      return [...prev, { product, quantity }]
    })
    setIsOpen(true)
  }

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i)))
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0), [items])

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        removeItem,
        updateQuantity,
        clear: () => setItems([]),
        subtotal,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider")
  return ctx
}
