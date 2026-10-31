/** El pago de un pedido por Mercado Pago: pedir el link, aplicar el pago, consultarlo al volver. Sin SQL ni Express. */
import { conflicto, noExiste } from "../../../core/negocio.error.js"
import type { UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type { CajaDePedidos, PasarelaDePedidos, PedidoRepository, PedidosQueries } from "../models/pedidos.ports.js"
import { referenciaDePedido, resultadoDelPago, sePuedePagar, type PagoDePedido, type Pedido } from "../models/pedido.model.js"

const NO_EXISTE = "No encontramos ese pedido."

export class PagarPedido {
  constructor(
    private pedidos: PedidoRepository,
    private queries: PedidosQueries,
    private pasarela: PasarelaDePedidos,
    private caja: CajaDePedidos,
    private uow: UnidadDeTrabajo,
  ) {}

  private async pedidoDelToken(token: string): Promise<Pedido> {
    const id = await this.pedidos.idPorToken(token)
    const pedido = id ? await this.queries.detalle(id) : null
    if (!pedido) throw noExiste(NO_EXISTE)
    return pedido
  }

  /** El link de Mercado Pago (también para reintentar si el pago anterior se rechazó). */
  async link(token: string): Promise<string> {
    const pedido = await this.pedidoDelToken(token)
    if (!sePuedePagar(pedido)) {
      throw conflicto(pedido.pagoEstado === "pagado" ? "Este pedido ya está pagado." : "Este pedido ya no se puede pagar. Escribinos por WhatsApp.")
    }
    // El mensaje de "no está configurado" de pagos es para la dueña; la clienta necesita otro.
    if (!(await this.pasarela.conectada())) throw conflicto("Por ahora no se puede pagar online. Escribinos por WhatsApp y coordinamos el pago.")
    return this.pasarela.crearLink({ pedidoId: pedido.id, token, lineas: pedido.items })
  }

  /** Lo llaman el aviso de Mercado Pago y la vuelta de la clienta: puede llegar dos veces o tarde. */
  async aplicar(pedidoId: number, pago: PagoDePedido): Promise<void> {
    if (!pago.aprobado) return
    await this.uow.ejecutar(async (tx) => {
      const pedido = await this.pedidos.paraPagar(pedidoId, tx)
      if (!pedido) return
      const r = resultadoDelPago(pedido, pago)
      if (!r.aplicar) return
      await this.pedidos.marcarPagado(pedidoId, pago.id, r.estado, tx)
      // La plata entra a la caja sola (con el id del pago, así no entra dos veces).
      await this.caja.cobrar({ pedidoId, clienteId: pedido.clienteId, monto: pago.monto, pagoId: pago.id }, tx)
    })
  }

  /** Al volver de Mercado Pago (que agrega payment_id): si viene el pago, se aplica sin esperar el aviso. */
  async consultar(token: string, pagoId?: string): Promise<Pedido> {
    const pedido = await this.pedidoDelToken(token)
    if (pagoId && pedido.pagoEstado === "pendiente") {
      const pago = await this.pasarela.consultarPago(pagoId)
      // Que el pago sea de ESTE pedido: si no, alguien podría usar un pago suyo de otra cosa.
      if (pago.referencia === referenciaDePedido(pedido.id)) {
        await this.aplicar(pedido.id, pago)
        return this.pedidoDelToken(token)
      }
    }
    return pedido
  }
}
