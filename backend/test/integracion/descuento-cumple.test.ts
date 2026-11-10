/** Descuento de cumpleaños en la tienda: la clienta con el cumple de este mes cargado, una compra por año. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { hoy } from "../../src/core/tiempo.util.js"
import { api, cerrar, limpiar, telefonoEscrito, token, valorConfig } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number
let porcentajeAntes: string | null
const mesActual = Number(hoy().slice(5, 7))
const comprar = (telefono: string) =>
  api()
    .post("/api/tienda/pedidos")
    .send({ cliente: { nombre: "Test Cumple", telefono }, items: [{ productoId, cantidad: 2 }] })

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  porcentajeAntes = await valorConfig("descuento_cumple_porcentaje")
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Cumple", precio: 10000, stock: 20 })).body.id
  // Una clienta con el cumple este mes y otra con el cumple el mes que viene.
  await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Cumple", telefono: telefonoEscrito(93), cumple: { dia: 1, mes: mesActual } })
  await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Otro mes", telefono: telefonoEscrito(94), cumple: { dia: 1, mes: (mesActual % 12) + 1 } })
})
afterAll(async () => {
  await pool.query("UPDATE configuracion SET valor = ? WHERE clave = 'descuento_cumple_porcentaje'", [porcentajeAntes ?? "0"])
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("descuento de cumpleaños", () => {
  it("apagado (0 %), no descuenta nada", async () => {
    await api().patch("/api/admin/configuracion").set(auth).send({ descuento_cumple_porcentaje: 0 })
    const r = await comprar(telefonoEscrito(93))
    expect(r.body).toMatchObject({ total: 20000, descuentoCumple: 0 })
    await api().patch(`/api/admin/pedidos/${r.body.id}/estado`).set(auth).send({ estado: "cancelado" })
  })

  it("la web ve el % y el panel no deja poner más de 50", async () => {
    expect((await api().patch("/api/admin/configuracion").set(auth).send({ descuento_cumple_porcentaje: 80 })).status).toBe(400)
    await api().patch("/api/admin/configuracion").set(auth).send({ descuento_cumple_porcentaje: 15 })
    expect((await api().get("/api/configuracion")).body.descuentoCumple).toBe(15)
  })

  it("en su mes, descuenta el % de los productos una sola vez por año", async () => {
    const r = await comprar(telefonoEscrito(93))
    expect(r.body).toMatchObject({ total: 17000, descuentoCumple: 3000 })
    const detalle = await api().get(`/api/admin/pedidos/${r.body.id}`).set(auth)
    expect(detalle.body).toMatchObject({ total: 17000, descuentoCumple: 3000 })
    expect((await comprar(telefonoEscrito(93))).body).toMatchObject({ total: 20000, descuentoCumple: 0 })
  })

  it("con el cumple en otro mes, no hay descuento", async () => {
    expect((await comprar(telefonoEscrito(94))).body.descuentoCumple).toBe(0)
  })
})
