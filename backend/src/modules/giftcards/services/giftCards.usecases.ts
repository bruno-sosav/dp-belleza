/** Casos de uso de las gift cards: venderlas (web y local), pagarlas, usarlas y administrarlas. Sin SQL ni Express. */
import { conflicto, noEncontrado, noExiste } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import {
  cuantoSeUsa,
  generarCodigo,
  mostrarCodigo,
  normalizarCodigo,
  problemaParaAnular,
  problemaParaUsar,
  redondear,
  referenciaDeGiftCard,
  seAplicaElPago,
  type GiftCard,
  type PagoDeGiftCard,
} from "../models/giftCard.model.js"
import type { Azar, CajaDeGiftCards, FiltrosGiftCards, GiftCardRepository, NormalizarTelefono, NuevaGiftCard, PasarelaDeGiftCards } from "../models/giftCards.ports.js"

const NO_EXISTE = "No encontramos esa gift card. Revisá el código."

type Comprador = { nombre: string; telefono?: string; email?: string }
type DatosDeVenta = { monto: number; comprador: Comprador; para?: string; mensaje?: string }

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex")

/** Arma la fila nueva con un código que no exista (con 32^8 combinaciones, repetir es casi imposible). */
async function nuevaGiftCard(repo: GiftCardRepository, azar: Azar, d: DatosDeVenta, extra: Pick<NuevaGiftCard, "estado" | "origen" | "pagoToken">, tx?: Transaccion) {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo(azar(8))
    if (await repo.porCodigo(codigo, tx)) continue
    const fila: NuevaGiftCard = {
      codigo,
      monto: redondear(d.monto),
      comprador: { nombre: d.comprador.nombre, telefono: d.comprador.telefono ?? null, email: d.comprador.email ?? null },
      para: d.para ?? null,
      mensaje: d.mensaje ?? null,
      ...extra,
    }
    return repo.crear(fila, tx)
  }
  throw new Error("No se pudo generar un código de gift card libre")
}

/** El teléfono normalizado (549…); si no se entiende, se guarda como lo escribió. */
async function conTelefono(d: DatosDeVenta, normalizar: NormalizarTelefono): Promise<DatosDeVenta> {
  const telefono = d.comprador.telefono
  return telefono ? { ...d, comprador: { ...d.comprador, telefono: (await normalizar(telefono)) ?? telefono } } : d
}

/** La clienta la compra en la web: queda esperando el pago de Mercado Pago. */
export class VenderEnLaWeb {
  constructor(
    private repo: GiftCardRepository,
    private pasarela: PasarelaDeGiftCards,
    private azar: Azar,
    private normalizar: NormalizarTelefono,
  ) {}

  async ejecutar(d: DatosDeVenta): Promise<{ pagoToken: string }> {
    if (!(await this.pasarela.conectada())) throw conflicto("Por ahora las gift cards se compran en el local o por WhatsApp.")
    const pagoToken = hex(this.azar(16))
    await nuevaGiftCard(this.repo, this.azar, await conTelefono(d, this.normalizar), { estado: "pendiente_pago", origen: "web", pagoToken })
    return { pagoToken }
  }
}

/** La dueña la vende en el local: queda activa y la plata entra a la caja con el medio que eligió. */
export class VenderEnElLocal {
  constructor(
    private repo: GiftCardRepository,
    private caja: CajaDeGiftCards,
    private azar: Azar,
    private normalizar: NormalizarTelefono,
    private uow: UnidadDeTrabajo,
  ) {}

  async ejecutar(d: DatosDeVenta & { medio: string }): Promise<GiftCard> {
    const datos = await conTelefono(d, this.normalizar)
    const id = await this.uow.ejecutar(async (tx) => {
      const id = await nuevaGiftCard(this.repo, this.azar, datos, { estado: "activa", origen: "local", pagoToken: null }, tx)
      await this.repo.activar(id, null, tx)
      const g = (await this.repo.porId(id, tx))!
      await this.repo.movimiento({ giftCardId: id, tipo: "carga", monto: g.monto, saldoDespues: g.monto, descripcion: "Vendida en el local" }, tx)
      await this.caja.cobrarVenta({ giftCardId: id, monto: g.monto, medio: d.medio, descripcion: `Gift card ${mostrarCodigo(g.codigo)}` }, tx)
      return id
    })
    return (await this.repo.porId(id))!
  }
}

/** El pago por Mercado Pago de una comprada en la web: pedir el link, aplicar el pago, consultarlo al volver. */
export class PagarGiftCard {
  constructor(
    private repo: GiftCardRepository,
    private pasarela: PasarelaDeGiftCards,
    private caja: CajaDeGiftCards,
    private uow: UnidadDeTrabajo,
  ) {}

  private async delToken(token: string): Promise<GiftCard> {
    const id = await this.repo.idPorToken(token)
    const g = id ? await this.repo.porId(id) : null
    if (!g) throw noExiste("No encontramos esa compra.")
    return g
  }

  async link(token: string): Promise<string> {
    const g = await this.delToken(token)
    if (g.estado !== "pendiente_pago") throw conflicto(g.estado === "activa" ? "Esta gift card ya está pagada." : "Esta gift card ya no se puede pagar.")
    if (!(await this.pasarela.conectada())) throw conflicto("Por ahora no se puede pagar online. Escribinos por WhatsApp.")
    return this.pasarela.crearLink({ giftCardId: g.id, token, monto: g.monto })
  }

  /** Lo llaman el aviso de Mercado Pago y la vuelta de la clienta: puede llegar dos veces o tarde. */
  async aplicar(id: number, pago: PagoDeGiftCard): Promise<void> {
    if (!pago.aprobado) return
    await this.uow.ejecutar(async (tx) => {
      const g = await this.repo.porId(id, tx)
      if (!g || !seAplicaElPago(g, pago)) return
      await this.repo.activar(id, pago.id, tx)
      await this.repo.movimiento({ giftCardId: id, tipo: "carga", monto: g.monto, saldoDespues: g.monto, descripcion: "Comprada en la web" }, tx)
      await this.caja.cobrarVenta({ giftCardId: id, monto: pago.monto, medio: "mercadopago", pagoId: pago.id, descripcion: `Gift card ${mostrarCodigo(g.codigo)} (web)` }, tx)
    })
  }

  /** Al volver de Mercado Pago: si viene el pago y es de esta gift card, se aplica sin esperar el aviso. */
  async consultar(token: string, pagoId?: string): Promise<GiftCard> {
    const g = await this.delToken(token)
    if (pagoId && g.estado === "pendiente_pago") {
      const pago = await this.pasarela.consultarPago(pagoId)
      if (pago.referencia === referenciaDeGiftCard(g.id)) {
        await this.aplicar(g.id, pago)
        return this.delToken(token)
      }
    }
    return g
  }
}

/** Usar el saldo: en el checkout de la tienda (orders) y en la caja del local (payments). */
export class UsarGiftCard {
  constructor(private repo: GiftCardRepository) {}

  private async usable(texto: string, tx?: Transaccion): Promise<GiftCard> {
    const codigo = normalizarCodigo(texto)
    const g = codigo ? await this.repo.porCodigo(codigo, tx) : null
    if (!g) throw noExiste(NO_EXISTE)
    const problema = problemaParaUsar(g)
    if (problema) throw conflicto(problema)
    return g
  }

  /** "¿Cuánto me queda?" desde la web, antes de comprar. */
  async saldo(texto: string): Promise<{ codigo: string; saldo: number }> {
    const g = await this.usable(texto)
    return { codigo: g.codigo, saldo: g.saldo }
  }

  /** Bloquea la gift card y dice cuánto se puede descontar de una compra de `total`. */
  async reservar(texto: string, total: number, tx: Transaccion): Promise<{ id: number; monto: number }> {
    const g = await this.usable(texto, tx)
    return { id: g.id, monto: cuantoSeUsa(g.saldo, total) }
  }

  /** Descuenta `monto` (ya reservado o pedido en la caja). Sin saldo suficiente, no descuenta nada. */
  async descontar(id: number, monto: number, ref: { pedidoId?: number; descripcion?: string }, tx: Transaccion): Promise<void> {
    const g = await this.repo.porId(id, tx)
    if (!g) throw noExiste(NO_EXISTE)
    const problema = problemaParaUsar(g)
    if (problema) throw conflicto(problema)
    if (monto > g.saldo + 0.001) throw conflicto(`A la gift card ${mostrarCodigo(g.codigo)} le quedan ${g.saldo.toLocaleString("es-AR")} pesos.`)
    const saldo = redondear(g.saldo - monto)
    await this.repo.cambiarSaldo(id, saldo, tx)
    await this.repo.movimiento({ giftCardId: id, tipo: "uso", monto, saldoDespues: saldo, pedidoId: ref.pedidoId ?? null, descripcion: ref.descripcion ?? null }, tx)
  }

  /** En la caja: la dueña escribe el código y cuánto se paga con ella. Devuelve el id. */
  async usarPorCodigo(texto: string, monto: number, descripcion: string, tx: Transaccion): Promise<number> {
    const g = await this.usable(texto, tx)
    await this.descontar(g.id, monto, { descripcion }, tx)
    return g.id
  }

  /** Vuelve saldo: se canceló el pedido o se borró el cobro. Si estaba anulada, no. */
  async reintegrar(id: number, monto: number, ref: { pedidoId?: number; descripcion?: string }, tx: Transaccion): Promise<void> {
    const g = await this.repo.porId(id, tx)
    if (!g || g.estado !== "activa" || monto <= 0) return
    const saldo = redondear(Math.min(g.monto, g.saldo + monto))
    await this.repo.cambiarSaldo(id, saldo, tx)
    await this.repo.movimiento({ giftCardId: id, tipo: "reintegro", monto, saldoDespues: saldo, pedidoId: ref.pedidoId ?? null, descripcion: ref.descripcion ?? null }, tx)
  }
}

/** El panel: la lista, una con sus movimientos, y anularla. */
export class AdministrarGiftCards {
  constructor(
    private repo: GiftCardRepository,
    private uow: UnidadDeTrabajo,
  ) {}

  listar(filtros: FiltrosGiftCards) {
    return this.repo.listar(filtros)
  }

  async ver(id: number) {
    const g = await this.repo.porId(id)
    if (!g) throw noEncontrado("Gift card")
    return { ...g, movimientos: await this.repo.movimientos(id) }
  }

  async anular(id: number) {
    await this.uow.ejecutar(async (tx) => {
      const g = await this.repo.porId(id, tx)
      if (!g) throw noEncontrado("Gift card")
      const problema = problemaParaAnular(g)
      if (problema) throw conflicto(problema)
      await this.repo.anular(id, tx)
      await this.repo.movimiento({ giftCardId: id, tipo: "anulacion", monto: g.saldo, saldoDespues: 0, descripcion: "Anulada desde el panel" }, tx)
    })
    return this.ver(id)
  }
}

