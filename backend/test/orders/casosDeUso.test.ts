/** Casos de uso de pedidos, probados con puertos en memoria (sin base de datos). */
import { beforeEach, describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../src/core/transaccion.port.js"
import { CrearPedido } from "../../src/modules/orders/services/checkout.usecases.js"
import { CambiarEstadoPedido, VerPedido } from "../../src/modules/orders/services/pedidos.usecases.js"
import { PagarPedido } from "../../src/modules/orders/services/pagos.usecases.js"
import type {
  CajaDePedidos,
  CatalogoDePedidos,
  ClientesDePedidos,
  InventarioDePedidos,
  PasarelaDePedidos,
  PedidoRepository,
  PedidosQueries,
} from "../../src/modules/orders/models/pedidos.ports.js"
import type { EstadoPedido, Linea, NuevoPedido, PagoDePedido, PagoEstado } from "../../src/modules/orders/models/pedido.model.js"

/** Una transacción en memoria: si el trabajo falla, se deshace lo que tocó el stock. */
const stock = new Map<number, number>()
const uow: UnidadDeTrabajo = {
  async ejecutar(trabajo) {
    const copia = new Map(stock)
    try {
      return await trabajo({} as Transaccion)
    } catch (err) {
      stock.clear()
      for (const [k, v] of copia) stock.set(k, v)
      throw err
    }
  },
}

const precios = new Map([
  [1, { nombre: "Sérum", precio: 18900 }],
  [2, { nombre: "Labial", precio: 8900.5 }],
])
const catalogo: CatalogoDePedidos = {
  vendibles: async (ids) => new Map(ids.filter((id) => precios.has(id)).map((id) => [id, precios.get(id)!])),
}
const inventario: InventarioDePedidos = {
  async reservar(lineas) {
    const problemas = lineas
      .filter((l) => (stock.get(l.productoId) ?? 0) < l.cantidad)
      .map((l) => ({ productoId: l.productoId, motivo: `stock insuficiente (quedan ${stock.get(l.productoId) ?? 0})` }))
    if (problemas.length) return { ok: false, problemas }
    for (const l of lineas) stock.set(l.productoId, stock.get(l.productoId)! - l.cantidad)
    return { ok: true }
  },
  async devolver(lineas) {
    for (const l of lineas) stock.set(l.productoId, (stock.get(l.productoId) ?? 0) + l.cantidad)
  },
}
const clientes: ClientesDePedidos = { buscarOCrear: async () => 7 }

/** Mercado Pago de mentira: `conectado` decide si el pedido espera el pago; `pagos` son los que "existen". */
let conectado = false
const pagosDeMp = new Map<string, PagoDePedido>()
const links: { pedidoId: number; token: string }[] = []
const pasarela: PasarelaDePedidos = {
  conectada: async () => conectado,
  crearLink: async ({ pedidoId, token }) => {
    links.push({ pedidoId, token })
    return `https://mp.test/pagar/${pedidoId}`
  },
  consultarPago: async (id) => pagosDeMp.get(id)!,
}
const cobrados: { pedidoId: number; monto: number; pagoId: number }[] = []
const caja: CajaDePedidos = {
  cobrar: async (c) => {
    if (!cobrados.some((x) => x.pagoId === c.pagoId)) cobrados.push(c)
  },
}

class PedidosEnMemoria implements PedidoRepository, PedidosQueries {
  guardados = new Map<number, NuevoPedido & { estado: EstadoPedido; pagoEstado: PagoEstado; pagoId?: number }>()
  async crear(p: NuevoPedido) {
    const id = this.guardados.size + 1
    this.guardados.set(id, { ...p, estado: "pendiente", pagoEstado: p.pago ? "pendiente" : null })
    return id
  }
  async paraPagar(id: number) {
    const p = this.guardados.get(id)
    return p ? { id, clienteId: p.clienteId, estado: p.estado, pagoEstado: p.pagoEstado, total: p.total } : null
  }
  async idPorToken(token: string) {
    return [...this.guardados].find(([, p]) => p.pago?.token === token)?.[0] ?? null
  }
  async marcarPagado(id: number, pagoId: number, estado: EstadoPedido) {
    Object.assign(this.guardados.get(id)!, { pagoEstado: "pagado", pagoId, estado })
  }
  async estadoParaCambiar(id: number) {
    return this.guardados.get(id)?.estado ?? null
  }
  async cambiarEstado(id: number, estado: EstadoPedido) {
    this.guardados.get(id)!.estado = estado
  }
  async lineas(id: number): Promise<Linea[]> {
    return this.guardados.get(id)!.lineas.map(({ productoId, cantidad }) => ({ productoId, cantidad }))
  }
  async listar() {
    return []
  }
  async detalle(id: number) {
    const p = this.guardados.get(id)
    if (!p) return null
    const cliente = { id: p.clienteId, nombre: "Ana", apellido: null, telefono: "5492231234567", email: null }
    return { id, estado: p.estado, pagoEstado: p.pagoEstado, total: p.total, notas: p.notas, cliente, creadoEn: "", actualizadoEn: "", items: p.lineas }
  }
}

let repo: PedidosEnMemoria
let crear: CrearPedido
const compra = (items: Linea[]) => crear.ejecutar({ cliente: { nombre: "Ana", telefono: "2231234567" }, items })

const tipoDeError = async (p: Promise<unknown>) => {
  try {
    await p
    return null
  } catch (err) {
    return err instanceof ErrorDeNegocio ? err.tipo : "otro"
  }
}

beforeEach(() => {
  stock.clear()
  stock.set(1, 5).set(2, 1)
  repo = new PedidosEnMemoria()
  conectado = false
  pagosDeMp.clear()
  links.length = 0
  cobrados.length = 0
  crear = new CrearPedido(repo, clientes, catalogo, inventario, pasarela, uow)
})

describe("CrearPedido (checkout)", () => {
  it("cobra el precio del catálogo, junta líneas repetidas y descuenta el stock", async () => {
    const p = await compra([
      { productoId: 1, cantidad: 1 },
      { productoId: 2, cantidad: 1 },
      { productoId: 1, cantidad: 2 },
    ])
    expect(p.total).toBe(65600.5)
    expect(p.items.map((i) => [i.productoId, i.cantidad, i.precioUnitario])).toEqual([
      [1, 3, 18900],
      [2, 1, 8900.5],
    ])
    expect(repo.guardados.get(p.id)?.clienteId).toBe(7)
    expect([stock.get(1), stock.get(2)]).toEqual([2, 0])
  })

  it("si un producto no está en el catálogo o falta stock, no guarda nada ni descuenta", async () => {
    const err = await compra([
      { productoId: 1, cantidad: 1 },
      { productoId: 2, cantidad: 5 },
      { productoId: 99, cantidad: 1 },
    ]).catch((e) => e)
    expect(err).toBeInstanceOf(ErrorDeNegocio)
    expect(err.tipo).toBe("conflicto")
    expect(err.detalle).toEqual([
      { productoId: 99, motivo: "no disponible" },
      { productoId: 2, motivo: "stock insuficiente (quedan 1)" },
    ])
    expect(repo.guardados.size).toBe(0)
    expect([stock.get(1), stock.get(2)]).toEqual([5, 1])
  })
})

describe("CambiarEstadoPedido (panel)", () => {
  const cambiar = (id: number, estado: EstadoPedido) =>
    new CambiarEstadoPedido(repo, inventario, new VerPedido(repo), uow).ejecutar(id, estado)

  it("sigue el flujo pendiente → confirmado → entregado", async () => {
    const { id } = await compra([{ productoId: 1, cantidad: 1 }])
    expect((await cambiar(id, "confirmado")).estado).toBe("confirmado")
    expect((await cambiar(id, "entregado")).estado).toBe("entregado")
  })

  it("no deja saltear pasos ni salir de un estado final", async () => {
    const { id } = await compra([{ productoId: 1, cantidad: 1 }])
    expect(await tipoDeError(cambiar(id, "entregado"))).toBe("conflicto")
    await cambiar(id, "cancelado")
    expect(await tipoDeError(cambiar(id, "pendiente"))).toBe("conflicto")
  })

  it("al cancelar, el stock vuelve", async () => {
    const { id } = await compra([{ productoId: 1, cantidad: 4 }])
    expect(stock.get(1)).toBe(1)
    await cambiar(id, "cancelado")
    expect(stock.get(1)).toBe(5)
  })

  it("un pedido que no existe es 404", async () => {
    expect(await tipoDeError(cambiar(123, "confirmado"))).toBe("no_encontrado")
  })
})

describe("pago con Mercado Pago", () => {
  const pagar = () => new PagarPedido(repo, repo, pasarela, caja, uow)
  const aprobado = (pedidoId: number, monto: number, id = 555): PagoDePedido => ({ id, aprobado: true, monto, referencia: `pedido-${pedidoId}` })

  it("sin Mercado Pago conectado el pedido no espera ningún pago", async () => {
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    expect(p.pagoToken).toBeNull()
    expect(repo.guardados.get(p.id)?.pagoEstado).toBeNull()
  })

  it("con Mercado Pago, el pedido nace esperando el pago y da el link con su referencia", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    expect(p.pagoToken).toMatch(/^[0-9a-f]{32}$/)
    expect(repo.guardados.get(p.id)?.pagoEstado).toBe("pendiente")
    expect(await pagar().link(p.pagoToken!)).toBe(`https://mp.test/pagar/${p.id}`)
    expect(links).toEqual([{ pedidoId: p.id, token: p.pagoToken }])
  })

  it("el pago aprobado confirma el pedido y entra una sola vez a la caja, aunque llegue dos veces", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 2 }])
    await pagar().aplicar(p.id, aprobado(p.id, 37800))
    await pagar().aplicar(p.id, aprobado(p.id, 37800))
    expect(repo.guardados.get(p.id)).toMatchObject({ estado: "confirmado", pagoEstado: "pagado", pagoId: 555 })
    expect(cobrados).toEqual([{ pedidoId: p.id, clienteId: 7, monto: 37800, pagoId: 555 }])
    expect(await tipoDeError(pagar().link(p.pagoToken!))).toBe("conflicto")
  })

  it("un pago rechazado o de menos no cambia nada", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    await pagar().aplicar(p.id, { ...aprobado(p.id, 18900), aprobado: false })
    await pagar().aplicar(p.id, aprobado(p.id, 100))
    expect(repo.guardados.get(p.id)).toMatchObject({ estado: "pendiente", pagoEstado: "pendiente" })
    expect(cobrados).toEqual([])
  })

  it("al volver de Mercado Pago se aplica el pago, pero solo si es de ESE pedido", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    pagosDeMp.set("1", aprobado(p.id + 99, 18900, 1))
    expect((await pagar().consultar(p.pagoToken!, "1")).pagoEstado).toBe("pendiente")
    pagosDeMp.set("2", aprobado(p.id, 18900, 2))
    expect(await pagar().consultar(p.pagoToken!, "2")).toMatchObject({ estado: "confirmado", pagoEstado: "pagado" })
  })

  it("si se desconectó Mercado Pago, avisa a la clienta que coordine por WhatsApp", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    conectado = false
    const err = await pagar().link(p.pagoToken!).catch((e) => e)
    expect(err.tipo).toBe("conflicto")
    expect(err.message).toContain("WhatsApp")
  })

  it("un pedido cancelado ya no se puede pagar; un token desconocido no existe", async () => {
    conectado = true
    const p = await compra([{ productoId: 1, cantidad: 1 }])
    await new CambiarEstadoPedido(repo, inventario, new VerPedido(repo), uow).ejecutar(p.id, "cancelado")
    expect(await tipoDeError(pagar().link(p.pagoToken!))).toBe("conflicto")
    expect(await tipoDeError(pagar().link("f".repeat(32)))).toBe("no_encontrado")
  })
})
