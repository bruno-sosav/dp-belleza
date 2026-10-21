/** Controller de "Tu cuenta". La usuaria sale siempre del token (req.usuario), nunca del body. */
import type { Request, Response } from "express"
import type { CambiarContrasena, EditarCuenta, VerCuenta } from "../../application/cuenta.usecases.js"
import { aCuenta, aCuentaGuardada } from "../dto/auth.dto.js"
import { cambioContrasena, cambiosCuenta } from "../schemas/auth.schema.js"

export class CuentaController {
  constructor(private casos: { ver: VerCuenta; editar: EditarCuenta; cambiarContrasena: CambiarContrasena }) {}

  ver = async (req: Request, res: Response) => {
    res.json(aCuenta(await this.casos.ver.ejecutar(req.usuario!.id)))
  }
  editar = async (req: Request, res: Response) => {
    res.json(aCuentaGuardada(await this.casos.editar.ejecutar(req.usuario!.id, cambiosCuenta.parse(req.body))))
  }
  cambiarContrasena = async (req: Request, res: Response) => {
    const { actual, nueva } = cambioContrasena.parse(req.body)
    await this.casos.cambiarContrasena.ejecutar(req.usuario!.id, actual, nueva)
    res.status(204).end()
  }
}
