/** Controller de los pedidos en el panel: valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { CambiarEstadoPedido, ListarPedidos, VerPedido } from "../services/pedidos.usecases.js"
import { aPedidoDetalle, aPedidoResumen } from "../schemas/pedido.dto.js"
import { cambioDeEstado, filtrosPedidos, idParam } from "../schemas/pedido.schema.js"

export class PedidosController {
  constructor(
    private casos: {
      listar: ListarPedidos
      ver: VerPedido
      cambiarEstado: CambiarEstadoPedido
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
}
