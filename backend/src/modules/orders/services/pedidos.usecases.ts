/** Casos de uso de los pedidos en el panel. Sin SQL ni Express. */
import { conflicto, noEncontrado } from "../../../core/negocio.error.js"
import type { UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type { InventarioDePedidos, PedidoRepository, PedidosQueries } from "../models/pedidos.ports.js"
import { puedeCambiarEstado, type EstadoPedido, type FiltrosPedidos, type Pedido } from "../models/pedido.model.js"

export class ListarPedidos {
  constructor(private queries: PedidosQueries) {}

  ejecutar(filtros: FiltrosPedidos) {
    return this.queries.listar(filtros)
  }
}

export class VerPedido {
  constructor(private queries: PedidosQueries) {}

  async ejecutar(id: number): Promise<Pedido> {
    const pedido = await this.queries.detalle(id)
    if (!pedido) throw noEncontrado("Pedido")
    return pedido
  }
}

/**
 * La dueña mueve el pedido: pendiente → confirmado → entregado, o lo cancela.
 * Al cancelar, el stock vuelve al inventario en la misma transacción.
 */
export class CambiarEstadoPedido {
  constructor(
    private pedidos: PedidoRepository,
    private inventario: InventarioDePedidos,
    private verPedido: VerPedido,
    private uow: UnidadDeTrabajo,
  ) {}

  async ejecutar(id: number, nuevo: EstadoPedido): Promise<Pedido> {
    await this.uow.ejecutar(async (tx) => {
      const actual = await this.pedidos.estadoParaCambiar(id, tx)
      if (!actual) throw noEncontrado("Pedido")
      if (!puedeCambiarEstado(actual, nuevo)) throw conflicto(`No se puede pasar un pedido de "${actual}" a "${nuevo}"`)
      await this.pedidos.cambiarEstado(id, nuevo, tx)
      if (nuevo === "cancelado") await this.inventario.devolver(await this.pedidos.lineas(id, tx), tx)
    })
    return this.verPedido.ejecutar(id)
  }
}
