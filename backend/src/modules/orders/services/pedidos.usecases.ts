/** Casos de uso de los pedidos en el panel. Sin SQL ni Express. */
import { conflicto, noEncontrado } from "../../../core/negocio.error.js"
import type { UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type { EnviosDePedidos, InventarioDePedidos, PedidoRepository, PedidosQueries } from "../models/pedidos.ports.js"
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
    private envios: Pick<EnviosDePedidos, "marcarEntregado">,
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
      // Si se lo mandaron, el envío también queda entregado.
      if (nuevo === "entregado") await this.envios.marcarEntregado(id, tx)
    })
    return this.verPedido.ejecutar(id)
  }
}

/** El envío de un pedido: generarlo con el transportista y seguirlo. */
export class EnvioDelPedido {
  constructor(
    private envios: Pick<EnviosDePedidos, "despachar" | "seguimiento">,
    private verPedido: VerPedido,
  ) {}

  async despachar(id: number): Promise<Pedido> {
    const p = await this.verPedido.ejecutar(id)
    if (!p.envio) throw conflicto("Este pedido se retira en el local: no tiene envío.")
    await this.envios.despachar({
      pedidoId: id,
      estadoPedido: p.estado,
      destinatario: { nombre: [p.cliente.nombre, p.cliente.apellido].filter(Boolean).join(" "), telefono: p.cliente.telefono, email: p.cliente.email },
      unidades: p.items.reduce((n, i) => n + i.cantidad, 0),
      valor: p.total - p.envio.costo,
    })
    return this.verPedido.ejecutar(id)
  }

  async seguimiento(id: number) {
    const p = await this.verPedido.ejecutar(id)
    if (!p.envio) throw conflicto("Este pedido se retira en el local: no tiene envío.")
    return this.envios.seguimiento(id)
  }
}
