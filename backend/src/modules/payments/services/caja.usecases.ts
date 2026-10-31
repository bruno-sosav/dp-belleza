/** Casos de uso de la caja (Finanzas → Caja). */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import { problemaDeCobroManual, sePuedeBorrar, totalesPorMedio, type ConceptoCobro, type MedioPago } from "../models/cobro.model.js"
import type { CobroRepository, ConsultasDeCaja, PedidosDeLaCaja, TurnosDeLaCaja } from "../models/pagos.ports.js"

/** Los turnos se conectan después (desde su módulo): hasta entonces, no hay. */
export type ConexionConTurnos = { actual: TurnosDeLaCaja | null }

export const turnosConectados = (c: ConexionConTurnos): TurnosDeLaCaja => {
  if (!c.actual) throw new Error("El módulo de turnos no se conectó a pagos (pagos.conectarTurnos)")
  return c.actual
}

/** Los pedidos se conectan después (desde orders). Sin conectar, un pago de pedido solo queda registrado. */
export type ConexionConPedidos = { actual: PedidosDeLaCaja | null }

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
    private unidad: UnidadDeTrabajo,
  ) {}

  async ejecutar(d: { monto: number; medio: MedioPago; concepto: ConceptoCobro; turnoId?: number; descripcion?: string }): Promise<number | null> {
    const problema = problemaDeCobroManual(d)
    if (problema) throw invalido(problema)
    return this.unidad.ejecutar(async (tx) => {
      let clienteId: number | null = null
      if (d.turnoId) {
        clienteId = await turnosConectados(this.turnos).clienteDelTurno(d.turnoId, tx)
        if (clienteId === null) throw noEncontrado("Turno")
      }
      return this.cobros.registrar({ ...d, clienteId }, tx)
    })
  }
}

/** Para corregir uno anotado por error. Los de Mercado Pago no. */
export class BorrarCobro {
  constructor(private cobros: CobroRepository) {}

  async ejecutar(id: number): Promise<void> {
    const c = await this.cobros.porId(id)
    if (!c) throw noEncontrado("Cobro")
    if (!sePuedeBorrar(c)) throw conflicto("Ese cobro es un pago de Mercado Pago: no se borra desde acá. Si hay que devolverlo, se hace desde Mercado Pago.")
    await this.cobros.borrar(id)
  }
}

/** Lo que entra a la caja desde otros módulos (turnos). */
export class CobrosDeTurnos {
  constructor(private cobros: CobroRepository) {}

  async alTerminar(c: { turnoId: number; clienteId: number; monto: number; medio: MedioPago }, tx: Transaccion) {
    await this.cobros.registrar({ ...c, concepto: "turno" }, tx)
  }

  /** La seña entra sola, con el id del pago: así no entra dos veces. */
  async sena(c: { turnoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion) {
    await this.cobros.registrar({ monto: c.monto, medio: "mercadopago", concepto: "sena", turnoId: c.turnoId, clienteId: c.clienteId, mpPagoId: c.pagoId }, tx)
  }

  anular(turnoId: number, tx: Transaccion) {
    return this.cobros.anularDelTurno(turnoId, tx)
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
