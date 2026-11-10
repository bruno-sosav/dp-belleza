/** Casos de uso de la compra en la web. Sin SQL ni Express. */
import { randomBytes } from "node:crypto"
import { ErrorDeNegocio } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type {
  CatalogoDePedidos,
  ClientesDePedidos,
  CotizacionDeEnvio,
  DireccionDeEnvio,
  EnviosDePedidos,
  GiftCardsDePedidos,
  InventarioDePedidos,
  PasarelaDePedidos,
  PedidoRepository,
} from "../models/pedidos.ports.js"
import { agruparItems, redondear, totalDe, type EstadoPedido, type Linea, type LineaConPrecio, type ProblemaDeCompra } from "../models/pedido.model.js"

export type EntradaCompra = {
  cliente: { nombre: string; apellido?: string; telefono: string; email?: string }
  items: Linea[]
  notas?: string
  /** Sin entrega, o "retiro": retira en el local. */
  entrega?: { tipo: "retiro" } | ({ tipo: "envio" } & DireccionDeEnvio)
  /** El código de una gift card para pagar todo o una parte. */
  giftCard?: string
}

/** `pagoToken`: con Mercado Pago conectado, para ir a pagar (y volver). null = se coordina por WhatsApp. */
export type PedidoCreado = {
  id: number
  /** "confirmado" si la gift card cubrió todo. */
  estado: EstadoPedido
  /** Productos + envío. */
  total: number
  /** Lo que cubrió la gift card (0 sin gift card). Lo que falta pagar es total - giftCard. */
  giftCard: number
  items: LineaConPrecio[]
  envio: { costo: number; plazoDias: number | null; gratis: boolean } | null
  pagoToken: string | null
}

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
    private envios: EnviosDePedidos,
    private giftCards: GiftCardsDePedidos,
    private uow: UnidadDeTrabajo,
  ) {}

  async ejecutar(entrada: EntradaCompra): Promise<PedidoCreado> {
    const items = agruparItems(entrada.items)
    const conMercadoPago = await this.pasarela.conectada()

    return this.uow.ejecutar(async (tx) => {
      const clienteId = await this.clientes.buscarOCrear(entrada.cliente, tx)
      const lineas = await this.apartar(items, tx)
      const subtotal = totalDe(lineas)
      const envio = await this.cotizarEnvio(entrada.entrega, lineas, subtotal)
      const total = redondear(subtotal + (envio?.costo ?? 0))
      // La gift card queda bloqueada hasta el commit: no se puede gastar el mismo saldo en dos compras.
      const giftCard = entrada.giftCard ? await this.giftCards.reservar(entrada.giftCard, total, tx) : null
      const falta = redondear(total - (giftCard?.monto ?? 0))
      const pago = conMercadoPago && falta > 0 ? { token: nuevoToken() } : null

      const id = await this.pedidos.crear({ clienteId, total, notas: entrada.notas ?? null, lineas, pago, giftCard }, tx)
      if (giftCard) await this.giftCards.descontar(giftCard.id, giftCard.monto, id, tx)
      if (entrada.entrega?.tipo === "envio" && envio) {
        const { tipo: _, ...destino } = entrada.entrega
        await this.envios.registrar(id, destino, envio, tx)
      }

      return {
        id,
        estado: falta > 0 ? "pendiente" : "confirmado",
        total,
        giftCard: giftCard?.monto ?? 0,
        items: lineas,
        envio: envio && { costo: envio.costo, plazoDias: envio.plazoDias, gratis: envio.gratis },
        pagoToken: pago?.token ?? null,
      }
    })
  }

  /** Precios del catálogo y stock apartado. Si algo no se puede comprar, falla con la lista de problemas. */
  private async apartar(items: Linea[], tx: Transaccion): Promise<LineaConPrecio[]> {
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

    return items.map((i) => {
      const p = vendibles.get(i.productoId)!
      return { ...i, nombre: p.nombre, precioUnitario: p.precio }
    })
  }

  /** El envío se cotiza con el subtotal real (de la base): el de la web era solo para mostrar. null = retira. */
  private async cotizarEnvio(entrega: EntradaCompra["entrega"], lineas: LineaConPrecio[], subtotal: number): Promise<CotizacionDeEnvio | null> {
    if (entrega?.tipo !== "envio") return null
    return this.envios.cotizar({ codigoPostal: entrega.codigoPostal, unidades: lineas.reduce((n, l) => n + l.cantidad, 0), subtotal })
  }
}
