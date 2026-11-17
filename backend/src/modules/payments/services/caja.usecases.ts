/** Casos de uso de la caja (Finanzas → Caja). */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import { problemaDeCobroManual, sePuedeBorrar, totalesPorMedio, type ConceptoCobro, type MedioPago } from "../models/cobro.model.js"
import type { CobroRepository, ConsultasDeCaja, GiftCardsDeLaCaja, PedidosDeLaCaja, TurnosDeLaCaja } from "../models/pagos.ports.js"

/** Los turnos se conectan después (desde su módulo): hasta entonces, no hay. */
export type ConexionConTurnos = { actual: TurnosDeLaCaja | null }

export const turnosConectados = (c: ConexionConTurnos): TurnosDeLaCaja => {
  if (!c.actual) throw new Error("El módulo de turnos no se conectó a pagos (pagos.conectarTurnos)")
  return c.actual
}

/** Los pedidos se conectan después (desde orders). Sin conectar, un pago de pedido solo queda registrado. */
export type ConexionConPedidos = { actual: PedidosDeLaCaja | null }

/** Las gift cards se conectan después (desde giftcards). Sin conectar, no se puede pagar con una. */
export type ConexionConGiftCards = { actual: GiftCardsDeLaCaja | null }

const giftCardsConectadas = (c: ConexionConGiftCards): GiftCardsDeLaCaja => {
  if (!c.actual) throw new Error("El módulo de gift cards no se conectó a pagos (pagos.conectarGiftCards)")
  return c.actual
}

/** Con medio gift_card, descuenta el saldo en la misma transacción y devuelve qué gift card fue. */
async function pagarConGiftCard(conexion: ConexionConGiftCards, c: { medio: MedioPago; monto: number; giftCard?: string }, descripcion: string, tx: Transaccion) {
  if (c.medio !== "gift_card") return null
  if (!c.giftCard) throw invalido("Escribí el código de la gift card.")
  return giftCardsConectadas(conexion).usar(c.giftCard, c.monto, descripcion, tx)
}

/** Un día de caja: cobros, totales por medio y turnos completados sin cobrar entero. */
export class VerCaja {
  constructor(private consultas: ConsultasDeCaja) {}

  async ejecutar(fecha: string) {
    const [cobros, sinCobrar] = await Promise.all([this.consultas.delDia(fecha), this.consultas.sinCobrar(fecha)])
    return { fecha, cobros, totales: totalesPorMedio(cobros), sinCobrar }
  }
}

/** Un cobro que anota la dueña. Con turno, la clienta sale del turno. */
export class AnotarCobro {
  constructor(
    private cobros: CobroRepository,
    private turnos: ConexionConTurnos,
    private giftCards: ConexionConGiftCards,
    private unidad: UnidadDeTrabajo,
  ) {}

  async ejecutar(d: { monto: number; medio: MedioPago; concepto: ConceptoCobro; turnoId?: number; descripcion?: string; giftCard?: string }): Promise<number | null> {
    const problema = problemaDeCobroManual(d)
    if (problema) throw invalido(problema)
    const { giftCard: _codigo, ...cobro } = d
    return this.unidad.ejecutar(async (tx) => {
      let clienteId: number | null = null
      if (d.turnoId) {
        clienteId = await turnosConectados(this.turnos).clienteDelTurno(d.turnoId, tx)
        if (clienteId === null) throw noEncontrado("Turno")
      }
      const giftCardId = await pagarConGiftCard(this.giftCards, d, d.turnoId ? `Turno #${d.turnoId}` : (d.descripcion ?? "Cobro en el local"), tx)
      return this.cobros.registrar({ ...cobro, clienteId, giftCardId }, tx)
    })
  }
}

/** Para corregir uno anotado por error. Los de Mercado Pago no. Si se pagó con gift card, el saldo vuelve. */
export class BorrarCobro {
  constructor(
    private cobros: CobroRepository,
    private giftCards: ConexionConGiftCards,
    private unidad: UnidadDeTrabajo,
  ) {}

  async ejecutar(id: number): Promise<void> {
    const c = await this.cobros.porId(id)
    if (!c) throw noEncontrado("Cobro")
    if (!sePuedeBorrar(c)) throw conflicto("Ese cobro es un pago de Mercado Pago: no se borra desde acá. Si hay que devolverlo, se hace desde Mercado Pago.")
    if (c.concepto === "gift_card") throw conflicto("Esa es la venta de una gift card: si hay que darla de baja, anulala desde Gift cards.")
    await this.unidad.ejecutar(async (tx) => {
      if (c.medio === "gift_card" && c.giftCardId) await giftCardsConectadas(this.giftCards).reintegrar(c.giftCardId, c.monto, "Se borró el cobro en la caja", tx)
      await this.cobros.borrar(id, tx)
    })
  }
}

/** Lo que entra a la caja desde otros módulos (turnos). */
export class CobrosDeTurnos {
  constructor(
    private cobros: CobroRepository,
    private giftCards: ConexionConGiftCards,
  ) {}

  async alTerminar(c: { turnoId: number; clienteId: number; monto: number; medio: MedioPago; giftCard?: string }, tx: Transaccion) {
    // El código no se guarda en el cobro: queda el id de la gift card.
    const { giftCard: _codigo, ...cobro } = c
    const giftCardId = await pagarConGiftCard(this.giftCards, c, `Turno #${c.turnoId}`, tx)
    await this.cobros.registrar({ ...cobro, concepto: "turno", giftCardId }, tx)
  }

  /** La seña entra sola, con el id del pago: así no entra dos veces. */
  async sena(c: { turnoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion) {
    await this.cobros.registrar({ monto: c.monto, medio: "mercadopago", concepto: "sena", turnoId: c.turnoId, clienteId: c.clienteId, mpPagoId: c.pagoId }, tx)
  }

  /** Se deshizo el "completado": lo pagado con gift card vuelve a su saldo. */
  async anular(turnoId: number, tx: Transaccion) {
    for (const g of await this.cobros.conGiftCardDelTurno(turnoId, tx)) {
      await giftCardsConectadas(this.giftCards).reintegrar(g.giftCardId, g.monto, `Turno #${turnoId} sin completar`, tx)
    }
    await this.cobros.anularDelTurno(turnoId, tx)
  }

  cobrado(turnoIds: number[]) {
    return this.cobros.cobradoPorTurnos(turnoIds)
  }
}

/** Lo que entra a la caja por los pedidos de la tienda (orders). */
export class CobrosDePedidos {
  constructor(private cobros: CobroRepository) {}

  /** El pago de Mercado Pago de un pedido: entra solo, con el id del pago, así no entra dos veces. */
  async mercadoPago(c: { pedidoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion) {
    await this.cobros.registrar(
      {
        monto: c.monto,
        medio: "mercadopago",
        concepto: "pedido",
        pedidoId: c.pedidoId,
        clienteId: c.clienteId,
        descripcion: `Pedido #${c.pedidoId} de la tienda`,
        mpPagoId: c.pagoId,
      },
      tx,
    )
  }
}

/** La venta de una gift card (giftcards): en el local con el medio que eligió; en la web, por Mercado Pago. */
export class CobrosDeGiftCards {
  constructor(private cobros: CobroRepository) {}

  async venta(c: { giftCardId: number; monto: number; medio: MedioPago; pagoId?: number; descripcion: string }, tx: Transaccion) {
    await this.cobros.registrar(
      { monto: c.monto, medio: c.medio, concepto: "gift_card", giftCardId: c.giftCardId, descripcion: c.descripcion, mpPagoId: c.pagoId ?? null },
      tx,
    )
  }
}
