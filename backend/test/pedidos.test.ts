import { describe, expect, it } from "vitest"
import { agruparItems, puedeCambiarEstado, redondear } from "../src/shared/models/pedidos.js"

describe("puedeCambiarEstado", () => {
  it("permite el flujo normal", () => {
    expect(puedeCambiarEstado("pendiente", "confirmado")).toBe(true)
    expect(puedeCambiarEstado("confirmado", "entregado")).toBe(true)
    expect(puedeCambiarEstado("pendiente", "cancelado")).toBe(true)
  })

  it("no permite salir de un estado final ni saltear pasos", () => {
    expect(puedeCambiarEstado("cancelado", "pendiente")).toBe(false)
    expect(puedeCambiarEstado("entregado", "cancelado")).toBe(false)
    expect(puedeCambiarEstado("pendiente", "entregado")).toBe(false)
  })
})

describe("agruparItems", () => {
  it("suma las cantidades del mismo producto", () => {
    expect(
      agruparItems([
        { productoId: 1, cantidad: 2 },
        { productoId: 2, cantidad: 1 },
        { productoId: 1, cantidad: 3 },
      ]),
    ).toEqual([
      { productoId: 1, cantidad: 5 },
      { productoId: 2, cantidad: 1 },
    ])
  })
})

describe("redondear", () => {
  it("deja dos decimales", () => {
    expect(redondear(0.1 + 0.2)).toBe(0.3)
  })
})
