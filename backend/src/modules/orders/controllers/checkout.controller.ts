/** Controller del checkout (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { CrearPedido } from "../services/checkout.usecases.js"
import { aPedidoCreado } from "../schemas/pedido.dto.js"
import { nuevoPedido } from "../schemas/pedido.schema.js"

export class CheckoutController {
  constructor(private crearPedido: CrearPedido) {}

  /** La clienta no tiene cuenta: se identifica por teléfono. */
  crear = async (req: Request, res: Response) => {
    const pedido = await this.crearPedido.ejecutar(nuevoPedido.parse(req.body))
    res.status(201).json(aPedidoCreado(pedido))
  }
}
