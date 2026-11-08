import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Producto } from "@dp/shared/types/producto.types"
import { CartContext, type CartItem } from "../lib/carrito"

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
