/** Stock de los productos (inventario.controller.ts). Devuelve cómo quedó. */
import { api } from "../../../shared/lib/api"

type Stock = { productoId: number; stock: number }

/** Contó lo que hay y lo corrige. */
export function ajustarStock(productoId: number, stock: number) {
  return api<Stock>(`/api/admin/productos/${productoId}/stock`, { metodo: "PUT", cuerpo: { stock } })
}
