/** El carrito: qué expone el CartProvider y el hook para usarlo desde cualquier pantalla. */
import { createContext, useContext } from "react"
import type { Producto } from "@dp/shared/types/producto.types"

export type CartItem = {
  product: Producto
  quantity: number
}

export type CartContextValue = {
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

export const CartContext = createContext<CartContextValue | undefined>(undefined)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider")
  return ctx
}
