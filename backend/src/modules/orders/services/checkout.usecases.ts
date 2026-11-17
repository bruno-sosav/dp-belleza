/** Casos de uso de la compra en la web. Sin SQL ni Express. */
import { randomBytes } from "node:crypto"
import { ErrorDeNegocio } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import type { Reloj } from "../../../core/reloj.port.js"
import type {
  AjustesDePedidos,
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
import { agruparItems, descuentoDeCumple, redondear, totalDe, type EstadoPedido, type Linea, type LineaConPrecio, type ProblemaDeCompra } from "../models/pedido.model.js"

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
  /** Lo que se descontó por el cumpleaños (0 si no aplica). `total` ya lo tiene restado. */
  descuentoCumple: number
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
/** Todo lo que necesita el checkout: los puertos de los otros módulos, la transacción y el reloj. */
export type DependenciasDelCheckout = {
  pedidos: PedidoRepository
  clientes: ClientesDePedidos
  catalogo: CatalogoDePedidos
  inventario: InventarioDePedidos
  pasarela: PasarelaDePedidos
  envios: EnviosDePedidos
  giftCards: GiftCardsDePedidos
  ajustes: AjustesDePedidos
  reloj: Reloj
  uow: UnidadDeTrabajo
}

export class CrearPedido {
  constructor(private d: DependenciasDelCheckout) {}

  async ejecutar(entrada: EntradaCompra): Promise<PedidoCreado> {
    const items = agruparItems(entrada.items)
    const [conMercadoPago, porcentajeCumple] = await Promise.all([this.d.pasarela.conectada(), this.d.ajustes.descuentoCumple()])

    return this.d.uow.ejecutar(async (tx) => {
      const clienteId = await this.d.clientes.buscarOCrear(entrada.cliente, tx)
      const lineas = await this.apartar(items, tx)
      const descuento = await this.descuentoDeCumple(clienteId, porcentajeCumple, totalDe(lineas), tx)
      const subtotal = redondear(totalDe(lineas) - descuento)
      const envio = await this.cotizarEnvio(entrada.entrega, lineas, subtotal)
      const total = redondear(subtotal + (envio?.costo ?? 0))
      // La gift card queda bloqueada hasta el commit: no se puede gastar el mismo saldo en dos compras.
      const giftCard = entrada.giftCard ? await this.d.giftCards.reservar(entrada.giftCard, total, tx) : null
      const falta = redondear(total - (giftCard?.monto ?? 0))
      const pago = conMercadoPago && falta > 0 ? { token: nuevoToken() } : null

      const id = await this.d.pedidos.crear({ clienteId, total, descuentoCumple: descuento, notas: entrada.notas ?? null, lineas, pago, giftCard }, tx)
      if (giftCard) await this.d.giftCards.descontar(giftCard.id, giftCard.monto, id, tx)
      if (entrada.entrega?.tipo === "envio" && envio) {
        const { tipo: _, ...destino } = entrada.entrega
        await this.d.envios.registrar(id, destino, envio, tx)
      }

      return {
        id,
        estado: falta > 0 ? "pendiente" : "confirmado",
        total,
        giftCard: giftCard?.monto ?? 0,
        descuentoCumple: descuento,
        items: lineas,
        envio: envio && { costo: envio.costo, plazoDias: envio.plazoDias, gratis: envio.gratis },
        pagoToken: pago?.token ?? null,
      }
    })
  }

  /** Si es el mes de su cumple y este año no lo usó, el % de los productos. 0 si no. */
  private async descuentoDeCumple(clienteId: number, porcentaje: number, subtotal: number, tx: Transaccion): Promise<number> {
    if (porcentaje <= 0) return 0
    const hoy = this.d.reloj.ahora().fecha
    const [cumple, yaLoUso] = await Promise.all([this.d.clientes.cumple(clienteId, tx), this.d.pedidos.usoDescuentoCumple(clienteId, Number(hoy.slice(0, 4)), tx)])
    return descuentoDeCumple({ cumple, hoy, porcentaje, yaLoUso, subtotal })
  }

  /** Precios del catálogo y stock apartado. Si algo no se puede comprar, falla con la lista de problemas. */
  private async apartar(items: Linea[], tx: Transaccion): Promise<LineaConPrecio[]> {
    // El precio sale siempre de la base, nunca del navegador.
    const vendibles = await this.d.catalogo.vendibles(
      items.map((i) => i.productoId),
      tx,
    )
    const problemas: ProblemaDeCompra[] = items
      .filter((i) => !vendibles.has(i.productoId))
      .map((i) => ({ productoId: i.productoId, motivo: "no disponible" }))

    // El inventario bloquea esas filas hasta el commit: dos compras simultáneas no venden la misma unidad.
    const reserva = await this.d.inventario.reservar(
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
    return this.d.envios.cotizar({ codigoPostal: entrega.codigoPostal, unidades: lineas.reduce((n, l) => n + l.cantidad, 0), subtotal })
  }
}
