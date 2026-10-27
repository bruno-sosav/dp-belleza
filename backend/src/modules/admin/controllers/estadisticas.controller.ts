/** Controller de las estadísticas: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { VerEstadisticas } from "../services/estadisticas.usecases.js"
import { aDia, aProductoVendido, aServicioHecho } from "../schemas/estadisticas.dto.js"
import { consultaDia, consultaPeriodo, consultaSerie } from "../schemas/estadisticas.schema.js"

export class EstadisticasController {
  constructor(private ver: VerEstadisticas) {}

  dias = async (req: Request, res: Response) => {
    const { dias, tiendaConectada } = await this.ver.serie(consultaSerie.parse(req.query).dias)
    res.json({ dias: dias.map(aDia), tiendaConectada })
  }
  servicios = async (req: Request, res: Response) => {
    res.json((await this.ver.serviciosMasHechos(consultaPeriodo.parse(req.query).dias)).map(aServicioHecho))
  }
  productos = async (req: Request, res: Response) => {
    res.json((await this.ver.productosMasVendidos(consultaPeriodo.parse(req.query).dias)).map(aProductoVendido))
  }
  serviciosDelDia = async (req: Request, res: Response) => {
    res.json((await this.ver.serviciosDelDia(consultaDia.parse(req.query).fecha)).map(aServicioHecho))
  }
}
