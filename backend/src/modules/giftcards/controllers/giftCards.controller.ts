/** Controller de gift cards (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { AdministrarGiftCards, PagarGiftCard, UsarGiftCard, VenderEnElLocal, VenderEnLaWeb } from "../services/giftCards.usecases.js"
import { aCompraWeb, aGiftCard, aGiftCardDetalle, aGiftCardPublica, aLinkDePago, aSaldo } from "../schemas/giftCards.dto.js"
import { compraWeb, consultaSaldo, filtrosGiftCards, idParam, pagoId, tokenDePago, ventaLocal } from "../schemas/giftCards.schema.js"

export type CasosDeUsoGiftCards = {
  venderWeb: VenderEnLaWeb
  venderLocal: VenderEnElLocal
  pagar: PagarGiftCard
  usar: UsarGiftCard
  administrar: AdministrarGiftCards
}

export class GiftCardsController {
  constructor(private casos: CasosDeUsoGiftCards) {}

  // ----- web
  comprar = async (req: Request, res: Response) => {
    res.status(201).json(aCompraWeb(await this.casos.venderWeb.ejecutar(compraWeb.parse(req.body))))
  }
  linkDePago = async (req: Request, res: Response) => {
    res.json(aLinkDePago(await this.casos.pagar.link(tokenDePago.parse(req.params.token))))
  }
  pago = async (req: Request, res: Response) => {
    res.json(aGiftCardPublica(await this.casos.pagar.consultar(tokenDePago.parse(req.params.token), pagoId.parse(req.query.payment_id))))
  }
  saldo = async (req: Request, res: Response) => {
    res.json(aSaldo(await this.casos.usar.saldo(consultaSaldo.parse(req.query).codigo)))
  }

  // ----- panel
  listar = async (req: Request, res: Response) => {
    const f = filtrosGiftCards.parse(req.query)
    res.json((await this.casos.administrar.listar({ estado: f.estado, busqueda: f.q })).map(aGiftCard))
  }
  ver = async (req: Request, res: Response) => {
    res.json(aGiftCardDetalle(await this.casos.administrar.ver(idParam.parse(req.params.id))))
  }
  vender = async (req: Request, res: Response) => {
    res.status(201).json(aGiftCard(await this.casos.venderLocal.ejecutar(ventaLocal.parse(req.body))))
  }
  anular = async (req: Request, res: Response) => {
    res.json(aGiftCardDetalle(await this.casos.administrar.anular(idParam.parse(req.params.id))))
  }
}
