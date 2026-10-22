/** Controller de la agenda (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { CalcularDisponibilidad, CambiarHorario, ConsultarHorario, GestionarBloqueos } from "../services/agenda.usecases.js"
import { aBloqueo, aFranja, aSlot, aTurnoParaAvisar } from "../schemas/agenda.dto.js"
import { consultaDisponibilidad, consultaDisponibilidadPanel, idParam, nuevoBloqueo, nuevoHorario, rangoBloqueos } from "../schemas/agenda.schema.js"

export type CasosDeUsoAgenda = {
  consultarHorario: ConsultarHorario
  cambiarHorario: CambiarHorario
  bloqueos: GestionarBloqueos
  disponibilidad: CalcularDisponibilidad
}

export class AgendaController {
  constructor(private casos: CasosDeUsoAgenda) {}

  // ----- web
  horario = async (_req: Request, res: Response) => {
    res.json((await this.casos.consultarHorario.ejecutar()).map(aFranja))
  }
  disponibilidadWeb = async (req: Request, res: Response) => {
    const { servicioId, fecha } = consultaDisponibilidad.parse(req.query)
    res.json((await this.casos.disponibilidad.ejecutar(servicioId, fecha, { paraLaWeb: true })).map(aSlot))
  }

  // ----- panel
  disponibilidadPanel = async (req: Request, res: Response) => {
    const { servicioId, fecha, excluir } = consultaDisponibilidadPanel.parse(req.query)
    res.json((await this.casos.disponibilidad.ejecutar(servicioId, fecha, { excluirTurnoId: excluir })).map(aSlot))
  }
  cambiarHorario = async (req: Request, res: Response) => {
    const { horarios, turnosFuera } = await this.casos.cambiarHorario.ejecutar(nuevoHorario.parse(req.body).franjas)
    res.json({ horarios: horarios.map(aFranja), turnosFuera: turnosFuera.map(aTurnoParaAvisar) })
  }
  listarBloqueos = async (req: Request, res: Response) => {
    const { desde, hasta } = rangoBloqueos.parse(req.query)
    res.json((await this.casos.bloqueos.listar(desde && hasta ? { desde, hasta } : undefined)).map(aBloqueo))
  }
  crearBloqueo = async (req: Request, res: Response) => {
    const d = nuevoBloqueo.parse(req.body)
    const { bloqueo, turnosAfectados } = await this.casos.bloqueos.crear({ desde: d.desde, hasta: d.hasta, motivo: d.motivo || null })
    res.status(201).json({ bloqueo: aBloqueo(bloqueo), turnosAfectados: turnosAfectados.map(aTurnoParaAvisar) })
  }
  quitarBloqueo = async (req: Request, res: Response) => {
    await this.casos.bloqueos.quitar(idParam.parse(req.params.id))
    res.status(204).end()
  }
}
