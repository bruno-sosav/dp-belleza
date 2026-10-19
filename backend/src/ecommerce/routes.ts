import { Router } from "express"
import { crearPedido } from "./service.js"
import { nuevoPedido } from "./validacion.js"

// Checkout de la tienda, montado en /api/tienda. Los productos y categorías
// para la web los sirve el módulo de catálogo (modules/catalog).
export const tienda = Router()

// Checkout: el cliente no tiene cuenta, se identifica por teléfono.
tienda.post("/pedidos", async (req, res) => {
  const pedido = await crearPedido(nuevoPedido.parse(req.body))
  res.status(201).json(pedido)
})
