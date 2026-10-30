/** Casos de uso de la compra en la web. Sin SQL ni Express. */
import { randomBytes } from "node:crypto"
import { ErrorDeNegocio } from "../../../core/negocio.error.js"
import type { UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type {
  CatalogoDePedidos,
  ClientesDePedidos,
  InventarioDePedidos,
  PasarelaDePedidos,
  PedidoRepository,
} from "../models/pedidos.ports.js"
import { agruparItems, totalDe, type Linea, type LineaConPrecio, type ProblemaDeCompra } from "../models/pedido.model.js"

export type EntradaCompra = {
  cliente: { nombre: string; apellido?: string; telefono: string; email?: string }
  items: Linea[]
  notas?: string
}

/** `pagoToken`: con Mercado Pago conectado, para ir a pagar (y volver). null = se coordina por WhatsApp. */
export type PedidoCreado = { id: number; estado: "pendiente"; total: number; items: LineaConPrecio[]; pagoToken: string | null }

const nuevoToken = () => randomBytes(16).toString("hex")

/**
 * Checkout: busca o crea a la clienta por teléfono, toma los precios del
 * catálogo, descuenta el stock del inventario y guarda el pedido. Todo en una
 * transacción: si algo falla, no queda nada a medias (ni el stock descontado).
 * Con Mercado Pago conectado, el pedido queda esperando el pago.
 */
export class CrearPedido {
  constructor(
    private pedidos: PedidoRepository,
    private clientes: ClientesDePedidos,
    private catalogo: CatalogoDePedidos,
    private inventario: InventarioDePedidos,
    private pasarela: PasarelaDePedidos,
    private uow: UnidadDeTrabajo,
  ) {}

  async ejecutar(entrada: EntradaCompra): Promise<PedidoCreado> {
    const items = agruparItems(entrada.items)
    const pago = (await this.pasarela.conectada()) ? { token: nuevoToken() } : null

    return this.uow.ejecutar(async (tx) => {
      const clienteId = await this.clientes.buscarOCrear(entrada.cliente, tx)

      // El precio sale siempre de la base, nunca del navegador.
      const vendibles = await this.catalogo.vendibles(
        items.map((i) => i.productoId),
        tx,
      )
      const problemas: ProblemaDeCompra[] = items
        .filter((i) => !vendibles.has(i.productoId))
        .map((i) => ({ productoId: i.productoId, motivo: "no disponible" }))

      // El inventario bloquea esas filas hasta el commit: dos compras simultáneas no venden la misma unidad.
      const reserva = await this.inventario.reservar(
        items.filter((i) => vendibles.has(i.productoId)),
        tx,
      )
      if (!reserva.ok) problemas.push(...reserva.problemas)
      if (problemas.length) throw new ErrorDeNegocio("conflicto", "Algunos productos no se pueden comprar", problemas)

      const lineas = items.map((i) => {
        const p = vendibles.get(i.productoId)!
        return { ...i, nombre: p.nombre, precioUnitario: p.precio }
      })
      const total = totalDe(lineas)
      const id = await this.pedidos.crear({ clienteId, total, notas: entrada.notas ?? null, lineas, pago }, tx)

      return { id, estado: "pendiente", total, items: lineas, pagoToken: pago?.token ?? null }
    })
  }
}
