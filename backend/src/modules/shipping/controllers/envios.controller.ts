/** Controller de envíos: cotizar desde la web y la cuenta de Andreani en el panel. */
import type { Request, Response } from "express"
import type { ConfigurarAndreani, CotizarEnvio } from "../services/envios.usecases.js"
import { aCotizacion, aCuentaAndreani } from "../schemas/envios.dto.js"
import { consultaCotizacion, cuentaAndreani } from "../schemas/envios.schema.js"

export class EnviosController {
  constructor(
    private cotizar: CotizarEnvio,
    private andreani: ConfigurarAndreani,
  ) {}

  cotizacion = async (req: Request, res: Response) => {
    const q = consultaCotizacion.parse(req.query)
    res.json(aCotizacion(await this.cotizar.ejecutar({ codigoPostal: q.cp, unidades: q.unidades, subtotal: q.subtotal })))
  }

  cuenta = async (_req: Request, res: Response) => {
    res.json(aCuentaAndreani(await this.andreani.estado()))
  }

  guardarCuenta = async (req: Request, res: Response) => {
    res.json(aCuentaAndreani(await this.andreani.guardar(cuentaAndreani.parse(req.body))))
  }

  borrarCuenta = async (_req: Request, res: Response) => {
    await this.andreani.desconectar()
    res.status(204).end()
  }
}
