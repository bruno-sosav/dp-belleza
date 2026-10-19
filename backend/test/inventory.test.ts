/** Inventario: reglas de stock y casos de uso con un repositorio en memoria. */
import { describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../src/core/errores.js"
import type { Transaccion } from "../src/core/transaccion.js"
import { DevolverStock, ReponerOAjustarStock, ReservarStock } from "../src/modules/inventory/application/casosDeUso.js"
import type { StockRepository } from "../src/modules/inventory/domain/ports.js"
import { problemasDeStock, type Linea } from "../src/modules/inventory/domain/stock.js"

class StockEnMemoria implements StockRepository {
  constructor(public stock: Map<number, number>) {}
  async disponibles(ids: number[]) {
    return new Map(ids.filter((id) => this.stock.has(id)).map((id) => [id, this.stock.get(id)!]))
  }
  async mover(lineas: Linea[], signo: -1 | 1) {
    for (const l of lineas) this.stock.set(l.productoId, this.stock.get(l.productoId)! + signo * l.cantidad)
  }
  async fijar(id: number, n: number) {
    if (!this.stock.has(id)) return false
    this.stock.set(id, n)
    return true
  }
}

const tx = {} as Transaccion

describe("problemasDeStock", () => {
  it("dice qué falta y por qué, con el mensaje de siempre del checkout", () => {
    expect(
      problemasDeStock(
        [
          { productoId: 1, cantidad: 2 },
          { productoId: 2, cantidad: 5 },
          { productoId: 3, cantidad: 1 },
        ],
        new Map([
          [1, 2],
          [2, 3],
        ]),
      ),
    ).toEqual([
      { productoId: 2, motivo: "stock insuficiente (quedan 3)" },
      { productoId: 3, motivo: "no disponible" },
    ])
  })
})

describe("ReservarStock", () => {
  it("si alcanza para todo, descuenta", async () => {
    const repo = new StockEnMemoria(new Map([[1, 5]]))
    expect(await new ReservarStock(repo).ejecutar([{ productoId: 1, cantidad: 2 }], tx)).toEqual({ ok: true })
    expect(repo.stock.get(1)).toBe(3)
  })

  it("si falta algo, no toca NADA (ni las líneas que sí alcanzaban)", async () => {
    const repo = new StockEnMemoria(new Map([[1, 5], [2, 0]]))
    const r = await new ReservarStock(repo).ejecutar([{ productoId: 1, cantidad: 2 }, { productoId: 2, cantidad: 1 }], tx)
    expect(r.ok).toBe(false)
    expect(repo.stock).toEqual(new Map([[1, 5], [2, 0]]))
  })
})

describe("devolver, reponer y ajustar", () => {
  it("devolver suma lo cancelado", async () => {
    const repo = new StockEnMemoria(new Map([[1, 0]]))
    await new DevolverStock(repo).ejecutar([{ productoId: 1, cantidad: 2 }], tx)
    expect(repo.stock.get(1)).toBe(2)
  })

  it("reponer suma y devuelve el stock nuevo; ajustar fija el conteo", async () => {
    const repo = new StockEnMemoria(new Map([[1, 4]]))
    const caso = new ReponerOAjustarStock(repo)
    expect(await caso.reponer(1, 6)).toBe(10)
    expect(await caso.ajustar(1, 7)).toBe(7)
  })

  it("valida cantidades y que el producto exista", async () => {
    const caso = new ReponerOAjustarStock(new StockEnMemoria(new Map([[1, 4]])))
    const tipo = async (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof ErrorDeNegocio ? e.tipo : "otro"))
    expect(await tipo(caso.reponer(1, 0))).toBe("invalido")
    expect(await tipo(caso.ajustar(1, -1))).toBe("invalido")
    expect(await tipo(caso.ajustar(1, 1.5))).toBe("invalido")
    expect(await tipo(caso.reponer(99, 1))).toBe("no_encontrado")
  })
})
