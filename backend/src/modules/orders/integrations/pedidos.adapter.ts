/** Cumplen los puertos de orders con lo que exportan los otros módulos (su fachada, nunca sus repositories). */
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { inventario } from "../../inventory/inventory.module.js"
import type { CatalogoDePedidos, ClientesDePedidos, InventarioDePedidos } from "../models/pedidos.ports.js"

/** Clientas: el módulo customers (la misma ficha que usa la turnera). */
export const clientesDePedidos: ClientesDePedidos = {
  buscarOCrear: (datos, tx) => clientes.buscarOCrear(datos, tx),
}

/** Precios: el módulo catalog. */
export const catalogoDePedidos: CatalogoDePedidos = {
  vendibles: (ids, tx) => catalogo.productosParaVender(ids, tx),
}

/** Stock: el módulo inventory. */
export const inventarioDePedidos: InventarioDePedidos = {
  reservar: (lineas, tx) => inventario.reservar(lineas, tx),
  devolver: (lineas, tx) => inventario.devolver(lineas, tx),
}
