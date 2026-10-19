/**
 * Presentación del inventario: controller, schemas y rutas del panel juntos,
 * porque son dos endpoints. Mismo patrón que los otros módulos.
 *
 *   PUT  /api/admin/productos/:id/stock    { "stock": 12 }     contó lo que hay y lo corrige
 *   POST /api/admin/productos/:id/reponer  { "cantidad": 6 }   llegó mercadería
 */
import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { ReponerOAjustarStock } from "../application/casosDeUso.js"

const idParam = z.coerce.number().int().positive()
const ajuste = z.object({ stock: z.number().int().min(0).max(1_000_000) })
const reposicion = z.object({ cantidad: z.number().int().positive().max(1_000_000) })

export class InventarioController {
  constructor(private stock: ReponerOAjustarStock) {}

  ajustar = async (req: Request, res: Response) => {
    const productoId = idParam.parse(req.params.id)
    res.json({ productoId, stock: await this.stock.ajustar(productoId, ajuste.parse(req.body).stock) })
  }

  reponer = async (req: Request, res: Response) => {
    const productoId = idParam.parse(req.params.id)
    res.json({ productoId, stock: await this.stock.reponer(productoId, reposicion.parse(req.body).cantidad) })
  }
}

export function rutasPanelInventario(c: InventarioController): Router {
  const r = Router()
  r.put("/productos/:id/stock", c.ajustar)
  r.post("/productos/:id/reponer", c.reponer)
  return r
}
