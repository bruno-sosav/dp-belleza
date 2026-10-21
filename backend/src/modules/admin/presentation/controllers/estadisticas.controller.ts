/** Controller de las estadísticas: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { VerEstadisticas } from "../../application/estadisticas.usecases.js"
import { aDia, aServicioHecho } from "../dto/estadisticas.dto.js"
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
  serviciosDelDia = async (req: Request, res: Response) => {
    res.json((await this.ver.serviciosDelDia(consultaDia.parse(req.query).fecha)).map(aServicioHecho))
  }
}
