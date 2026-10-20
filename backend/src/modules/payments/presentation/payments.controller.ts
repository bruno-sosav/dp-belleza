/** Controller de pagos (la "C" de MVC): valida, llama al caso de uso y devuelve el DTO. */
import type { Request, Response } from "express"
import type { Reloj } from "../../../core/reloj.js"
import type { AnotarCobro, BorrarCobro, VerCaja } from "../application/caja.js"
import type { ConfigurarMercadoPago, RecibirAvisoDePago } from "../application/mercadoPago.js"
import { aDiaDeCaja, aEstadoMercadoPago } from "./payments.dto.js"
import { consultaEstadoPago, credenciales, diaDeCaja, idParam, nuevoCobro } from "./payments.schemas.js"

export type CasosDeUsoPagos = {
  verCaja: VerCaja
  anotarCobro: AnotarCobro
  borrarCobro: BorrarCobro
  cuenta: ConfigurarMercadoPago
  avisos: RecibirAvisoDePago
}

export class PagosController {
  constructor(
    private casos: CasosDeUsoPagos,
    private reloj: Reloj,
  ) {}

  // ----- panel: caja
  caja = async (req: Request, res: Response) => {
    const { fecha = this.reloj.ahora().fecha } = diaDeCaja.parse(req.query)
    res.json(aDiaDeCaja(await this.casos.verCaja.ejecutar(fecha)))
  }
  anotar = async (req: Request, res: Response) => {
    res.status(201).json({ id: await this.casos.anotarCobro.ejecutar(nuevoCobro.parse(req.body)) })
  }
  borrar = async (req: Request, res: Response) => {
    await this.casos.borrarCobro.ejecutar(idParam.parse(req.params.id))
    res.status(204).end()
  }

  // ----- panel: Mercado Pago
  estadoCuenta = async (_req: Request, res: Response) => {
    res.json(aEstadoMercadoPago(await this.casos.cuenta.estado()))
  }
  guardarCuenta = async (req: Request, res: Response) => {
    res.json(aEstadoMercadoPago(await this.casos.cuenta.guardar(credenciales.parse(req.body))))
  }
  probarCuenta = async (_req: Request, res: Response) => {
    res.json(aEstadoMercadoPago(await this.casos.cuenta.probar()))
  }
  desconectar = async (_req: Request, res: Response) => {
    await this.casos.cuenta.desconectar()
    res.status(204).end()
  }

  // ----- públicas
  /** Mercado Pago manda el id en el body (webhooks) o en la query (IPN vieja). */
  aviso = async (req: Request, res: Response) => {
    const r = await this.casos.avisos.ejecutar({
      tipo: String(req.body?.type ?? req.query.type ?? req.query.topic ?? ""),
      dataId: String(req.body?.data?.id ?? req.query["data.id"] ?? req.query.id ?? ""),
      firma: req.header("x-signature"),
      requestId: req.header("x-request-id"),
    })
    // Lo que no es nuestro se contesta 200, para que Mercado Pago no lo reintente.
    if (r === "ignorado") res.status(200).json({ ignorado: true })
    else if (r === "sin_cuenta") res.status(503).json({ error: "Mercado Pago no está configurado" })
    else if (r === "firma_invalida") res.status(401).json({ error: "Firma inválida" })
    else res.status(200).json({ ok: true })
  }
  estadoPago = async (req: Request, res: Response) => {
    res.json({ estado: await this.casos.avisos.estado(consultaEstadoPago.parse(req.query).referencia) })
  }
}
