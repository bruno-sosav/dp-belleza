/** Controller del checkout (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { CrearPedido } from "../services/checkout.usecases.js"
import type { PagarPedido } from "../services/pagos.usecases.js"
import { aLinkDePago, aPedidoCreado, aPedidoPublico } from "../schemas/pedido.dto.js"
import { nuevoPedido, pagoId, tokenDePago } from "../schemas/pedido.schema.js"

export class CheckoutController {
  constructor(
    private crearPedido: CrearPedido,
    private pagar: PagarPedido,
  ) {}

  /** La clienta no tiene cuenta: se identifica por teléfono. */
  crear = async (req: Request, res: Response) => {
    const pedido = await this.crearPedido.ejecutar(nuevoPedido.parse(req.body))
    res.status(201).json(aPedidoCreado(pedido))
  }

  /** Al volver de Mercado Pago: cómo quedó el pago (si viene payment_id, se aplica). */
  pago = async (req: Request, res: Response) => {
    res.json(aPedidoPublico(await this.pagar.consultar(tokenDePago.parse(req.params.token), pagoId.parse(req.query.payment_id))))
  }

  /** El link para ir a pagar (o reintentar). */
  linkDePago = async (req: Request, res: Response) => {
    res.json(aLinkDePago(await this.pagar.link(tokenDePago.parse(req.params.token))))
  }
}
