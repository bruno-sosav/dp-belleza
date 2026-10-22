/** Controller de recordatorios (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { GestionarTipos, MarcarRecordatorio, VerRecordatorios } from "../services/recordatorios.usecases.js"
import { aAviso, aHecho, aTipo } from "../schemas/recordatorios.dto.js"
import { datosTipo, idParam, marca } from "../schemas/recordatorios.schema.js"

export type CasosDeUsoRecordatorios = { ver: VerRecordatorios; marcar: MarcarRecordatorio; tipos: GestionarTipos }

export class RecordatoriosController {
  constructor(private casos: CasosDeUsoRecordatorios) {}

  paraMandar = async (_req: Request, res: Response) => {
    const { paraMandar, hechosHoy } = await this.casos.ver.ejecutar()
    res.json({ paraMandar: paraMandar.map(aAviso), hechosHoy: hechosHoy.map(aHecho) })
  }
  marcar = async (req: Request, res: Response) => {
    const { estado, ...registro } = marca.parse(req.body)
    res.status(201).json({ id: await this.casos.marcar.marcar(registro, estado) })
  }
  deshacer = async (req: Request, res: Response) => {
    await this.casos.marcar.deshacer(idParam.parse(req.params.id))
    res.status(204).end()
  }

  tipos = async (_req: Request, res: Response) => {
    res.json((await this.casos.tipos.listar()).map(aTipo))
  }
  crearTipo = async (req: Request, res: Response) => {
    res.status(201).json(aTipo(await this.casos.tipos.crear(datosTipo.parse(req.body))))
  }
  actualizarTipo = async (req: Request, res: Response) => {
    res.json(aTipo(await this.casos.tipos.actualizar(idParam.parse(req.params.id), datosTipo.parse(req.body))))
  }
  borrarTipo = async (req: Request, res: Response) => {
    await this.casos.tipos.borrar(idParam.parse(req.params.id))
    res.status(204).end()
  }
}
