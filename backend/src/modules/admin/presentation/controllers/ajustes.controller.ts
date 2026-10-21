/** Controller de los ajustes: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { GuardarAjustes, LeerAjustes, VerAjustesPublicos } from "../../application/ajustes.usecases.js"
import { aAjustesDelPanel, aAjustesPublicos } from "../dto/ajustes.dto.js"
import { cambiosAjustes } from "../schemas/ajustes.schema.js"

export class AjustesController {
  constructor(private casos: { leer: LeerAjustes; guardar: GuardarAjustes; publicos: VerAjustesPublicos }) {}

  delPanel = async (_req: Request, res: Response) => {
    res.json(aAjustesDelPanel(await this.casos.leer.todos()))
  }
  guardar = async (req: Request, res: Response) => {
    res.json(aAjustesDelPanel(await this.casos.guardar.ejecutar(cambiosAjustes.parse(req.body))))
  }
  publicos = async (_req: Request, res: Response) => {
    res.json(aAjustesPublicos(await this.casos.publicos.ejecutar()))
  }
}
