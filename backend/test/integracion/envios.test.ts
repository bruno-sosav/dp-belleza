/** Envíos por HTTP, en modo prueba (sin cuenta de Andreani): cotizar, comprar con envío, despachar y seguir. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, limpiar, telefonoEscrito, token, valorConfig } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number
let pedidoId: number
const originales = new Map<string, string | null>()
const CLAVES = ["envio_modo", "envio_gratis_desde", "envio_cp_origen"]
const direccion = { calle: "Av. Colón 1234, 3° B", ciudad: "Mar del Plata", provincia: "Buenos Aires", codigoPostal: "B7600FDA" }

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  for (const c of CLAVES) originales.set(c, await valorConfig(c))
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Envío", precio: 10000, stock: 10 })).body.id
})
afterAll(async () => {
  for (const [c, v] of originales) if (v !== null) await pool.query("UPDATE configuracion SET valor = ? WHERE clave = ?", [v, c])
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

const comprar = (entrega: object, tel: number, cantidad = 1) =>
  api()
    .post("/api/tienda/pedidos")
    .send({ cliente: { nombre: "Test Envío", telefono: telefonoEscrito(tel) }, items: [{ productoId, cantidad }], entrega })

describe("envíos", () => {
  it("con envíos desactivados no se cotiza ni se compra con envío", async () => {
    await api().patch("/api/admin/configuracion").set(auth).send({ envio_modo: "desactivado" })
    expect((await api().get("/api/configuracion")).body.envios).toBe(false)
    expect((await api().get("/api/tienda/envios/cotizar").query({ cp: "7600", unidades: 1, subtotal: 1000 })).status).toBe(409)
    expect((await comprar({ tipo: "envio", ...direccion }, 40)).status).toBe(409)
  })

  it("en modo prueba cotiza, y es gratis desde el monto configurado", async () => {
    await api().patch("/api/admin/configuracion").set(auth).send({ envio_modo: "prueba", envio_gratis_desde: 30000, envio_cp_origen: "7600" })
    expect((await api().get("/api/configuracion")).body).toMatchObject({ envios: true, envioGratisDesde: 30000 })
    const c = await api().get("/api/tienda/envios/cotizar").query({ cp: "9410", unidades: 2, subtotal: 20000 })
    expect(c.status).toBe(200)
    expect(c.body).toMatchObject({ gratis: false, prueba: true })
    expect(c.body.costo).toBeGreaterThan(0)
    expect((await api().get("/api/tienda/envios/cotizar").query({ cp: "9410", unidades: 2, subtotal: 30000 })).body).toMatchObject({ costo: 0, gratis: true })
    expect((await api().get("/api/tienda/envios/cotizar").query({ cp: "12", unidades: 1, subtotal: 1 })).status).toBe(400)
  })

  it("comprar con envío suma el costo al total y guarda la dirección", async () => {
    const r = await comprar({ tipo: "envio", ...direccion }, 41)
    expect(r.status).toBe(201)
    pedidoId = r.body.id
    expect(r.body.envio.costo).toBeGreaterThan(0)
    expect(r.body.total).toBe(10000 + r.body.envio.costo)
    const [filas] = await pool.query<RowDataPacket[]>("SELECT codigo_postal, estado, proveedor FROM envios WHERE pedido_id = ?", [pedidoId])
    expect(filas[0]).toEqual({ codigo_postal: "7600", estado: "a_despachar", proveedor: "prueba" })
  })

  it("una dirección incompleta o una provincia que no existe se rechazan", async () => {
    expect((await comprar({ tipo: "envio", ...direccion, provincia: "Narnia" }, 42)).status).toBe(400)
    expect((await comprar({ tipo: "envio", ...direccion, calle: "" }, 42)).status).toBe(400)
  })

  it("el panel ve el envío; no se despacha sin confirmar el pedido", async () => {
    const d = await api().get(`/api/admin/pedidos/${pedidoId}`).set(auth)
    expect(d.body).toMatchObject({ entrega: "envio", envio: { ciudad: "Mar del Plata", estado: "a_despachar", numeroSeguimiento: null } })
    const lista = await api().get("/api/admin/pedidos").query({ estado: "pendiente" }).set(auth)
    expect(lista.body.find((p: { id: number }) => p.id === pedidoId)).toMatchObject({ entrega: "envio", envioEstado: "a_despachar" })
    expect((await api().post(`/api/admin/pedidos/${pedidoId}/envio/despachar`).set(auth)).status).toBe(409)
  })

  it("confirmado, se despacha una vez y se puede seguir", async () => {
    await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "confirmado" })
    const r = await api().post(`/api/admin/pedidos/${pedidoId}/envio/despachar`).set(auth)
    expect(r.status).toBe(200)
    expect(r.body.envio).toMatchObject({ estado: "despachado", numeroSeguimiento: expect.stringMatching(/^PRUEBA-/) })
    expect((await api().post(`/api/admin/pedidos/${pedidoId}/envio/despachar`).set(auth)).status).toBe(409)
    const s = await api().get(`/api/admin/pedidos/${pedidoId}/envio/seguimiento`).set(auth)
    expect(s.body[0]).toMatchObject({ estado: "Envío creado" })
  })

  it("al marcar el pedido entregado, el envío queda entregado", async () => {
    await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "entregado" })
    expect((await api().get(`/api/admin/pedidos/${pedidoId}`).set(auth)).body.envio.estado).toBe("entregado")
  })

  it("un pedido que se retira no tiene envío para despachar", async () => {
    const id = (await comprar({ tipo: "retiro" }, 43)).body.id
    await api().patch(`/api/admin/pedidos/${id}/estado`).set(auth).send({ estado: "confirmado" })
    expect((await api().post(`/api/admin/pedidos/${id}/envio/despachar`).set(auth)).status).toBe(409)
  })

  it("la cuenta de Andreani empieza vacía y nunca devuelve la contraseña", async () => {
    const r = await api().get("/api/admin/andreani").set(auth)
    expect(r.status).toBe(200)
    expect(r.body).toBeNull()
    expect((await api().put("/api/admin/andreani").set(auth).send({ usuario: "x" })).status).toBe(400)
  })
})
