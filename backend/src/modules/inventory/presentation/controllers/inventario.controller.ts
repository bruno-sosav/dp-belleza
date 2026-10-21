/** Controller del inventario (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { ReponerOAjustarStock } from "../../application/inventario.usecases.js"
import { aStock } from "../dto/inventario.dto.js"
import { ajuste, idParam, reposicion } from "../schemas/inventario.schema.js"

export class InventarioController {
  constructor(private stock: ReponerOAjustarStock) {}

  ajustar = async (req: Request, res: Response) => {
    const productoId = idParam.parse(req.params.id)
    res.json(aStock(productoId, await this.stock.ajustar(productoId, ajuste.parse(req.body).stock)))
  }

  reponer = async (req: Request, res: Response) => {
    const productoId = idParam.parse(req.params.id)
    res.json(aStock(productoId, await this.stock.reponer(productoId, reposicion.parse(req.body).cantidad)))
  }
}
