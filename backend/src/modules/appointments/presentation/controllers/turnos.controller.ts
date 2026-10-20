/** Controller de los turnos (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { Reloj } from "../../../../core/reloj.js"
import type {
  CambiarEstadoTurno,
  CompletarTurno,
  DarTurno,
  GestionarSenas,
  MiTurno,
  ReprogramarTurno,
  ReservarTurno,
  VerTurnos,
} from "../../application/turnos.js"
import { aLinkDePago, aMiTurno, aReserva, aReservaHecha, aSena, aTurnoDelPanel } from "../dto/turnos.dto.js"
import {
  cambiosTurno,
  completar,
  filtrosTurnos,
  idParam,
  identificacion,
  nuevoEstado,
  pagoId,
  reservaWeb,
  tokenPublico,
  tokenSena,
  turnoDelPanel,
} from "../schemas/turnos.schemas.js"

export type CasosDeUsoTurnos = {
  reservar: ReservarTurno
  dar: DarTurno
  reprogramar: ReprogramarTurno
  cambiarEstado: CambiarEstadoTurno
  completar: CompletarTurno
  ver: VerTurnos
  miTurno: MiTurno
  senas: GestionarSenas
}

export class TurnosController {
  constructor(
    private casos: CasosDeUsoTurnos,
    private reloj: Reloj,
  ) {}

  // ----- web
  reservar = async (req: Request, res: Response) => {
    res.status(201).json(aReservaHecha(await this.casos.reservar.ejecutar(reservaWeb.parse(req.body))))
  }
  reserva = async (req: Request, res: Response) => {
    res.json(aReserva(await this.casos.ver.reserva(tokenPublico.parse(req.params.token))))
  }
  buscarMiTurno = async (req: Request, res: Response) => {
    const { codigo, telefono } = identificacion.parse(req.body)
    res.json(aMiTurno(await this.casos.miTurno.buscar(codigo, telefono)))
  }
  cancelarMiTurno = async (req: Request, res: Response) => {
    const { codigo, telefono } = identificacion.parse(req.body)
    res.json(aMiTurno(await this.casos.miTurno.cancelar(codigo, telefono)))
  }
  sena = async (req: Request, res: Response) => {
    res.json(aSena(await this.casos.senas.consultar(tokenSena.parse(req.params.token), pagoId.parse(req.query.payment_id))))
  }
  pagarSena = async (req: Request, res: Response) => {
    res.json(aLinkDePago(await this.casos.senas.nuevoLink(tokenSena.parse(req.params.token))))
  }

  // ----- panel
  listar = async (req: Request, res: Response) => {
    const { desde, hasta, estado } = filtrosTurnos(this.reloj.ahora().fecha).parse(req.query)
    res.json((await this.casos.ver.entre(desde, hasta, estado)).map(aTurnoDelPanel))
  }
  uno = async (req: Request, res: Response) => {
    res.json(aTurnoDelPanel(await this.casos.ver.uno(idParam.parse(req.params.id))))
  }
  dar = async (req: Request, res: Response) => {
    const id = await this.casos.dar.ejecutar(turnoDelPanel.parse(req.body))
    res.status(201).json(aTurnoDelPanel(await this.casos.ver.uno(id)))
  }
  reprogramar = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    await this.casos.reprogramar.ejecutar(id, cambiosTurno.parse(req.body))
    res.json(aTurnoDelPanel(await this.casos.ver.uno(id)))
  }
  cambiarEstado = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    await this.casos.cambiarEstado.ejecutar(id, nuevoEstado.parse(req.body).estado)
    res.json(aTurnoDelPanel(await this.casos.ver.uno(id)))
  }
  completar = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    await this.casos.completar.ejecutar(id, completar.parse(req.body).cobro)
    res.json(aTurnoDelPanel(await this.casos.ver.uno(id)))
  }
}
