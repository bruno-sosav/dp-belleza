/** Controller de los pedidos en el panel: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { CambiarEstadoPedido, EnvioDelPedido, ListarPedidos, VerPedido } from "../services/pedidos.usecases.js"
import { aPedidoDetalle, aPedidoResumen, aSeguimiento } from "../schemas/pedido.dto.js"
import { cambioDeEstado, filtrosPedidos, idParam } from "../schemas/pedido.schema.js"

export class PedidosController {
  constructor(
    private casos: {
      listar: ListarPedidos
      ver: VerPedido
      cambiarEstado: CambiarEstadoPedido
      envio: EnvioDelPedido
    },
  ) {}

  listar = async (req: Request, res: Response) => {
    res.json((await this.casos.listar.ejecutar(filtrosPedidos.parse(req.query))).map(aPedidoResumen))
  }

  ver = async (req: Request, res: Response) => {
    res.json(aPedidoDetalle(await this.casos.ver.ejecutar(idParam.parse(req.params.id))))
  }

  cambiarEstado = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    const { estado } = cambioDeEstado.parse(req.body)
    res.json(aPedidoDetalle(await this.casos.cambiarEstado.ejecutar(id, estado)))
  }

  /** Genera el envío con Andreani (o el simulador) y devuelve el pedido con el número de seguimiento. */
  despachar = async (req: Request, res: Response) => {
    res.json(aPedidoDetalle(await this.casos.envio.despachar(idParam.parse(req.params.id))))
  }

  seguimiento = async (req: Request, res: Response) => {
    res.json(aSeguimiento(await this.casos.envio.seguimiento(idParam.parse(req.params.id))))
  }
}
