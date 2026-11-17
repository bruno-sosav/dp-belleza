/** Gift cards: reglas puras y casos de uso con puertos en memoria (sin base de datos). */
import { beforeEach, describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../src/core/transaccion.port.js"
import {
  cuantoSeUsa,
  generarCodigo,
  mostrarCodigo,
  normalizarCodigo,
  problemaParaAnular,
  problemaParaUsar,
  seAplicaElPago,
  type GiftCard,
  type Movimiento,
  type PagoDeGiftCard,
} from "../../src/modules/giftcards/models/giftCard.model.js"
import type { CajaDeGiftCards, GiftCardRepository, NuevaGiftCard, NuevoMovimiento, PasarelaDeGiftCards } from "../../src/modules/giftcards/models/giftCards.ports.js"
import { AdministrarGiftCards, PagarGiftCard, UsarGiftCard, VenderEnElLocal, VenderEnLaWeb } from "../../src/modules/giftcards/services/giftCards.usecases.js"

describe("reglas de las gift cards", () => {
  it("el código usa solo letras y números que no se confunden", () => {
    const codigo = generarCodigo(new Uint8Array([0, 1, 2, 31, 32, 100, 200, 255]))
    expect(codigo).toBe("ABC9AEJ9")
    expect(codigo).not.toMatch(/[01OI]/)
    expect(() => generarCodigo(new Uint8Array(3))).toThrow()
  })

  it("acepta el código como lo escriba la clienta", () => {
    expect(normalizarCodigo("ab3k-xy7q")).toBe("AB3KXY7Q")
    expect(normalizarCodigo(" AB3K XY7Q ")).toBe("AB3KXY7Q")
    expect(normalizarCodigo("AB3K-XY7")).toBeNull()
    expect(normalizarCodigo("AB3K-XY70")).toBeNull() // el 0 no está en el alfabeto
    expect(mostrarCodigo("AB3KXY7Q")).toBe("AB3K-XY7Q")
  })

  it("se usa todo el saldo o lo que cueste la compra, lo que sea menos", () => {
    expect(cuantoSeUsa(10000, 18900)).toBe(10000)
    expect(cuantoSeUsa(10000, 8900.5)).toBe(8900.5)
    expect(cuantoSeUsa(0, 500)).toBe(0)
  })

  it("solo se usa activa y con saldo", () => {
    expect(problemaParaUsar({ estado: "pendiente_pago", saldo: 0 })).toMatch(/no se pagó/)
    expect(problemaParaUsar({ estado: "anulada", saldo: 0 })).toMatch(/anulada/)
    expect(problemaParaUsar({ estado: "activa", saldo: 0 })).toMatch(/saldo/)
    expect(problemaParaUsar({ estado: "activa", saldo: 1 })).toBeNull()
  })

  it("el pago se aplica una vez, aprobado y por el monto", () => {
    const g = { estado: "pendiente_pago" as const, monto: 20000 }
    expect(seAplicaElPago(g, { aprobado: true, monto: 20000 })).toBe(true)
    expect(seAplicaElPago(g, { aprobado: false, monto: 20000 })).toBe(false)
    expect(seAplicaElPago(g, { aprobado: true, monto: 100 })).toBe(false)
    expect(seAplicaElPago({ ...g, estado: "activa" }, { aprobado: true, monto: 20000 })).toBe(false)
  })

  it("se anula solo si no se usó", () => {
    expect(problemaParaAnular({ estado: "activa", saldo: 20000, monto: 20000 })).toBeNull()
    expect(problemaParaAnular({ estado: "activa", saldo: 5000, monto: 20000 })).toMatch(/en parte/)
    expect(problemaParaAnular({ estado: "anulada", saldo: 0, monto: 20000 })).toMatch(/ya está anulada/)
  })
})

/** Las tablas en memoria. */
class GiftCardsEnMemoria implements GiftCardRepository {
  filas = new Map<number, GiftCard & { pagoToken: string | null }>()
  movs: (NuevoMovimiento & { id: number })[] = []
  async crear(g: NuevaGiftCard) {
    const id = this.filas.size + 1
    this.filas.set(id, { ...g, id, saldo: 0, activadaAt: null, creadaEn: "2026-11-10 10:00" })
    return id
  }
  async porId(id: number) {
    const g = this.filas.get(id)
    return g ? { ...g } : null
  }
  async porCodigo(codigo: string) {
    const g = [...this.filas.values()].find((x) => x.codigo === codigo)
    return g ? { ...g } : null
  }
  async idPorToken(token: string) {
    return [...this.filas.values()].find((x) => x.pagoToken === token)?.id ?? null
  }
  async activar(id: number) {
    const g = this.filas.get(id)!
    Object.assign(g, { estado: "activa", saldo: g.monto, activadaAt: "2026-11-10 10:05" })
  }
  async cambiarSaldo(id: number, saldo: number) {
    this.filas.get(id)!.saldo = saldo
  }
  async anular(id: number) {
    Object.assign(this.filas.get(id)!, { estado: "anulada", saldo: 0 })
  }
  async movimiento(m: NuevoMovimiento) {
    this.movs.push({ ...m, id: this.movs.length + 1 })
  }
  async movimientos(id: number): Promise<Movimiento[]> {
    return this.movs
      .filter((m) => m.giftCardId === id)
      .map((m) => ({ id: m.id, fechaHora: "", tipo: m.tipo, monto: m.monto, saldoDespues: m.saldoDespues, pedidoId: m.pedidoId ?? null, descripcion: m.descripcion ?? null }))
  }
  async listar() {
    return [...this.filas.values()]
  }
}

const uow: UnidadDeTrabajo = { ejecutar: (trabajo) => trabajo({} as Transaccion) }
const tx = {} as Transaccion
/** Bytes "al azar" que cambian en cada llamada, para que los códigos no se repitan. */
let semilla = 0
const azar = (n: number) => Uint8Array.from({ length: n }, () => semilla++ % 256)

let conectada = true
const pagosDeMp = new Map<string, PagoDeGiftCard>()
const pasarela: PasarelaDeGiftCards = {
  conectada: async () => conectada,
  crearLink: async ({ giftCardId, monto }) => `https://mp.test/gc/${giftCardId}/${monto}`,
  consultarPago: async (id) => pagosDeMp.get(id)!,
}
const cobros: { giftCardId: number; monto: number; medio: string; pagoId?: number }[] = []
const caja: CajaDeGiftCards = {
  cobrarVenta: async ({ giftCardId, monto, medio, pagoId }) => {
    cobros.push({ giftCardId, monto, medio, ...(pagoId ? { pagoId } : {}) })
  },
}

/** Como customers: "223…" → "549223…". */
const normalizar = async (t: string) => (/^\d{10}$/.test(t) ? `549${t}` : null)

let repo: GiftCardsEnMemoria
const comprador = { nombre: "Ana", telefono: "2231234567" }
const tipoDeError = (p: Promise<unknown>) => p.then(() => null).catch((e) => (e instanceof ErrorDeNegocio ? e.tipo : "otro"))

beforeEach(() => {
  repo = new GiftCardsEnMemoria()
  conectada = true
  pagosDeMp.clear()
  cobros.length = 0
})

describe("comprar en la web", () => {
  const pagar = () => new PagarGiftCard(repo, pasarela, caja, uow)

  it("queda esperando el pago, sin saldo, y da el link por el monto", async () => {
    const { pagoToken } = await new VenderEnLaWeb(repo, pasarela, azar, normalizar).ejecutar({ monto: 20000, comprador, para: "Sofi" })
    expect(pagoToken).toMatch(/^[0-9a-f]{32}$/)
    expect(repo.filas.get(1)).toMatchObject({ estado: "pendiente_pago", saldo: 0, origen: "web", para: "Sofi" })
    expect(repo.filas.get(1)!.comprador.telefono).toBe("5492231234567")
    expect(await pagar().link(pagoToken)).toBe("https://mp.test/gc/1/20000")
  })

  it("sin Mercado Pago conectado no se puede comprar online", async () => {
    conectada = false
    expect(await tipoDeError(new VenderEnLaWeb(repo, pasarela, azar, normalizar).ejecutar({ monto: 20000, comprador }))).toBe("conflicto")
  })

  it("el pago la activa con todo el saldo y entra una sola vez a la caja", async () => {
    const { pagoToken } = await new VenderEnLaWeb(repo, pasarela, azar, normalizar).ejecutar({ monto: 20000, comprador })
    const pago = { id: 77, aprobado: true, monto: 20000, referencia: "giftcard-1" }
    await pagar().aplicar(1, pago)
    await pagar().aplicar(1, pago)
    expect(repo.filas.get(1)).toMatchObject({ estado: "activa", saldo: 20000 })
    expect(cobros).toEqual([{ giftCardId: 1, monto: 20000, medio: "mercadopago", pagoId: 77 }])
    expect(repo.movs.map((m) => m.tipo)).toEqual(["carga"])
    expect(await tipoDeError(pagar().link(pagoToken))).toBe("conflicto")
  })

  it("al volver de Mercado Pago se aplica el pago solo si es de ESA gift card", async () => {
    const { pagoToken } = await new VenderEnLaWeb(repo, pasarela, azar, normalizar).ejecutar({ monto: 20000, comprador })
    pagosDeMp.set("1", { id: 1, aprobado: true, monto: 20000, referencia: "giftcard-99" })
    expect((await pagar().consultar(pagoToken, "1")).estado).toBe("pendiente_pago")
    pagosDeMp.set("2", { id: 2, aprobado: true, monto: 20000, referencia: "giftcard-1" })
    expect(await pagar().consultar(pagoToken, "2")).toMatchObject({ estado: "activa", saldo: 20000 })
    expect(await tipoDeError(pagar().consultar("f".repeat(32)))).toBe("no_encontrado")
  })
})

describe("vender en el local, usar y anular", () => {
  const vender = (monto = 30000) => new VenderEnElLocal(repo, caja, azar, normalizar, uow).ejecutar({ monto, comprador: { nombre: "Caro" }, medio: "efectivo" })
  const usar = () => new UsarGiftCard(repo)

  it("vendida en el local queda activa y la plata entra a la caja con su medio", async () => {
    const g = await vender()
    expect(g).toMatchObject({ estado: "activa", saldo: 30000, origen: "local" })
    expect(cobros).toEqual([{ giftCardId: g.id, monto: 30000, medio: "efectivo" }])
  })

  it("se consulta el saldo con el código escrito de cualquier forma", async () => {
    const g = await vender()
    const escrito = mostrarCodigo(g.codigo).toLowerCase()
    expect(await usar().saldo(escrito)).toEqual({ codigo: g.codigo, saldo: 30000 })
    expect(await tipoDeError(usar().saldo("ZZZZ-ZZZZ"))).toBe("no_encontrado")
  })

  it("en la caja se descuenta lo pagado; sin saldo suficiente no descuenta nada", async () => {
    const g = await vender()
    await usar().usarPorCodigo(g.codigo, 12000, "Turno #4", tx)
    expect(repo.filas.get(g.id)!.saldo).toBe(18000)
    expect(await tipoDeError(usar().usarPorCodigo(g.codigo, 20000, "Turno #5", tx))).toBe("conflicto")
    expect(repo.filas.get(g.id)!.saldo).toBe(18000)
  })

  it("en la tienda: reservar dice cuánto cubre; reintegrar devuelve el saldo sin pasarse del monto", async () => {
    const g = await vender(10000)
    const r = await usar().reservar(g.codigo, 18900, tx)
    expect(r).toEqual({ id: g.id, monto: 10000 })
    await usar().descontar(g.id, r.monto, { pedidoId: 5 }, tx)
    expect(repo.filas.get(g.id)!.saldo).toBe(0)
    expect(await tipoDeError(usar().reservar(g.codigo, 100, tx))).toBe("conflicto")
    await usar().reintegrar(g.id, 99999, { pedidoId: 5 }, tx)
    expect(repo.filas.get(g.id)!.saldo).toBe(10000)
    expect(repo.movs.map((m) => [m.tipo, m.saldoDespues])).toEqual([
      ["carga", 10000],
      ["uso", 0],
      ["reintegro", 10000],
    ])
  })

  it("una sin usar se anula; una usada en parte no", async () => {
    const admin = new AdministrarGiftCards(repo, uow)
    const nueva = await vender()
    expect((await admin.anular(nueva.id)).estado).toBe("anulada")
    expect(await tipoDeError(usar().saldo(nueva.codigo))).toBe("conflicto")

    const usada = await vender()
    await usar().usarPorCodigo(usada.codigo, 1000, "Turno", tx)
    expect(await tipoDeError(admin.anular(usada.id))).toBe("conflicto")
    expect((await admin.ver(usada.id)).movimientos.map((m) => m.tipo)).toEqual(["carga", "uso"])
    expect(await tipoDeError(admin.ver(999))).toBe("no_encontrado")
  })
})
