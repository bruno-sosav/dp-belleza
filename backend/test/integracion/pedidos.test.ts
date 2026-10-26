/** Pedidos de la tienda por HTTP: checkout y gestión desde el panel. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, limpiar, telefono, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number

const comprar = (items: { productoId: number; cantidad: number }[], tel = 70) =>
  api()
    .post("/api/tienda/pedidos")
    .send({ cliente: { nombre: "Test Pedido", telefono: telefonoEscrito(tel) }, items, notas: "Retiro en el local" })

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Crema", precio: 1500.5, stock: 10 })).body.id
})
afterAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("checkout", () => {
  it("crea el pedido con la ficha de la clienta por teléfono y el precio de la base", async () => {
    const r = await comprar([
      { productoId, cantidad: 1 },
      { productoId, cantidad: 2 },
    ])
    expect(r.status).toBe(201)
    expect(r.body).toEqual({
      id: expect.any(Number),
      estado: "pendiente",
      total: 4501.5,
      items: [{ productoId, nombre: "TEST Crema", cantidad: 3, precioUnitario: 1500.5, subtotal: 4501.5 }],
    })
    const [clientes] = await pool.query("SELECT id FROM clientes WHERE telefono = ?", [telefono(70)])
    expect((clientes as unknown[]).length).toBe(1)
  })

  it("rechaza datos inválidos con el detalle de cada campo", async () => {
    const r = await api().post("/api/tienda/pedidos").send({ cliente: { nombre: "" }, items: [] })
    expect(r.status).toBe(400)
    expect(r.body.detalle.map((d: { campo: string }) => d.campo)).toEqual(expect.arrayContaining(["cliente.nombre", "items"]))
  })

  it("un producto dado de baja no se puede comprar", async () => {
    const baja = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Baja", precio: 100, stock: 5, activo: false })).body.id
    const r = await comprar([{ productoId: baja, cantidad: 1 }], 71)
    expect(r.status).toBe(409)
    expect(r.body.detalle).toEqual([{ productoId: baja, motivo: "no disponible" }])
  })
})

describe("panel", () => {
  let pedidoId: number

  beforeAll(async () => {
    pedidoId = (await comprar([{ productoId, cantidad: 2 }], 72)).body.id
  })

  it("sin sesión no se ven los pedidos", async () => {
    expect((await api().get("/api/admin/pedidos")).status).toBe(401)
  })

  it("lista por estado con la clienta y las unidades", async () => {
    const r = await api().get("/api/admin/pedidos").query({ estado: "pendiente" }).set(auth)
    expect(r.status).toBe(200)
    const pedido = r.body.find((p: { id: number }) => p.id === pedidoId)
    expect(pedido).toMatchObject({ estado: "pendiente", total: 3001, unidades: 2, notas: "Retiro en el local" })
    expect(pedido.cliente).toMatchObject({ nombre: "Test Pedido", telefono: telefono(72) })
  })

  it("muestra el detalle con sus líneas", async () => {
    const r = await api().get(`/api/admin/pedidos/${pedidoId}`).set(auth)
    expect(r.body.items).toEqual([{ productoId, nombre: "TEST Crema", cantidad: 2, precioUnitario: 1500.5, subtotal: 3001 }])
    expect(r.body).not.toHaveProperty("unidades")
  })

  it("no deja saltear pasos y sigue el flujo hasta entregado", async () => {
    expect((await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "entregado" })).status).toBe(409)
    expect((await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "confirmado" })).body.estado).toBe("confirmado")
    expect((await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "entregado" })).body.estado).toBe("entregado")
  })

  it("un pedido que no existe es 404", async () => {
    expect((await api().get("/api/admin/pedidos/999999").set(auth)).status).toBe(404)
  })
})
