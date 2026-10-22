/** Controller del login: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { IniciarSesion } from "../services/sesion.usecases.js"
import { aSesion, aUsuarioDeSesion } from "../schemas/auth.dto.js"
import { credenciales } from "../schemas/auth.schema.js"

export class SesionController {
  constructor(private iniciar: IniciarSesion) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = credenciales.parse(req.body)
    res.json(aSesion(await this.iniciar.ejecutar(email, password)))
  }
  /** Después de requiereLogin: quién es, según el token. */
  yo = (req: Request, res: Response) => {
    res.json(aUsuarioDeSesion(req.usuario!))
  }
}
