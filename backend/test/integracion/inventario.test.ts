/** Inventario por HTTP: vender descuenta, sin stock no se vende, cancelar devuelve, reponer y ajustar. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.js"
import { api, cerrar, limpiar, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number

const stockActual = async () => (await api().get(`/api/admin/productos/${productoId}`).set(auth)).body.stock as number
const comprar = (cantidad: number, tel = 100) =>
  api()
    .post("/api/tienda/pedidos")
    .send({ cliente: { nombre: "Test", telefono: telefonoEscrito(tel % 100) }, items: [{ productoId, cantidad }] })

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Sérum", precio: 2000, stock: 3 })).body.id
})
afterAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("inventario", () => {
  let pedidoId: number
  it("vender descuenta el stock y cobra el precio del catálogo", async () => {
    const r = await comprar(2, 95)
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ total: 4000, items: [{ productoId, cantidad: 2, precioUnitario: 2000 }] })
    pedidoId = r.body.id
    expect(await stockActual()).toBe(1)
  })

  it("sin stock suficiente no se vende y no se descuenta nada", async () => {
    const r = await comprar(2, 96)
    expect(r.status).toBe(409)
    expect(r.body.detalle).toEqual([{ productoId, motivo: "stock insuficiente (quedan 1)" }])
    expect(await stockActual()).toBe(1)
  })

  it("cancelar el pedido devuelve las unidades", async () => {
    expect((await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "cancelado" })).status).toBe(200)
    expect(await stockActual()).toBe(3)
  })

  it("reponer suma y ajustar fija; editar el producto ya no toca el stock", async () => {
    expect((await api().post(`/api/admin/productos/${productoId}/reponer`).set(auth).send({ cantidad: 5 })).body).toEqual({ productoId, stock: 8 })
    expect((await api().put(`/api/admin/productos/${productoId}/stock`).set(auth).send({ stock: 2 })).body).toEqual({ productoId, stock: 2 })
    await api().patch(`/api/admin/productos/${productoId}`).set(auth).send({ nombre: "TEST Sérum 30ml", stock: 99 })
    expect(await stockActual()).toBe(2)
  })

  it("un producto dado de baja no se vende", async () => {
    await api().patch(`/api/admin/productos/${productoId}`).set(auth).send({ activo: false })
    const r = await comprar(1, 97)
    expect(r.status).toBe(409)
    expect(r.body.detalle).toEqual([{ productoId, motivo: "no disponible" }])
  })
})
