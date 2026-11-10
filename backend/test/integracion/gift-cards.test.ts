/** Gift cards de punta a punta: venderla en el local, usarla en la tienda y en la caja, y la compra web (pago simulado). */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.database.js"
import { giftCards } from "../../src/modules/giftcards/giftcards.module.js"
import { api, cerrar, limpiar, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number
let gc: { id: number; codigo: string }
const pagoToken = "d".repeat(32)

const saldo = async (codigo: string) => (await api().get("/api/tienda/gift-cards/saldo").query({ codigo })).body.saldo
const caja = async () => (await api().get("/api/admin/caja").set(auth)).body

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Gift", precio: 5000, stock: 10 })).body.id
})
afterAll(async () => {
  await pool.query("DELETE FROM cobros WHERE mp_pago_id = 555000111")
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("gift cards", () => {
  it("vendida en el local: queda activa con su código y la plata entra a la caja", async () => {
    const antes = (await caja()).totales
    const r = await api()
      .post("/api/admin/gift-cards")
      .set(auth)
      .send({ monto: 20000, medio: "efectivo", comprador: { nombre: "TEST Comprador" }, para: "Sofi", mensaje: "¡Feliz cumple!" })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ monto: 20000, saldo: 20000, estado: "activa", origen: "local", para: "Sofi" })
    expect(r.body.codigo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    gc = { id: r.body.id, codigo: r.body.codigo }
    const despues = (await caja()).totales
    expect(despues.porMedio.efectivo - antes.porMedio.efectivo).toBe(20000)
    expect(despues.total - antes.total).toBe(20000)
  })

  it("valida el monto y el medio", async () => {
    const base = { comprador: { nombre: "TEST Mal" }, medio: "efectivo" }
    expect((await api().post("/api/admin/gift-cards").set(auth).send({ ...base, monto: 100 })).status).toBe(400)
    expect((await api().post("/api/admin/gift-cards").set(auth).send({ ...base, monto: 10000, medio: "gift_card" })).status).toBe(400)
  })

  it("la web consulta el saldo con el código; uno que no existe es 404", async () => {
    const r = await api().get("/api/tienda/gift-cards/saldo").query({ codigo: gc.codigo.toLowerCase() })
    expect(r.body).toEqual({ codigo: gc.codigo, saldo: 20000 })
    expect((await api().get("/api/tienda/gift-cards/saldo").query({ codigo: "ZZZZ-ZZZZ" })).status).toBe(404)
  })

  let pedidoId: number
  it("en la tienda: si cubre todo, el pedido nace pagado y confirmado y baja el saldo", async () => {
    const r = await api()
      .post("/api/tienda/pedidos")
      .send({ cliente: { nombre: "Test Gift", telefono: telefonoEscrito(91) }, items: [{ productoId, cantidad: 2 }], giftCard: gc.codigo })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ total: 10000, giftCard: 10000, estado: "confirmado", pagoToken: null })
    pedidoId = r.body.id
    expect(await saldo(gc.codigo)).toBe(10000)
    const d = await api().get(`/api/admin/pedidos/${pedidoId}`).set(auth)
    expect(d.body).toMatchObject({ pagoEstado: "pagado", giftCard: { codigo: gc.codigo, monto: 10000 } })
  })

  it("si no alcanza, cubre una parte y queda lo que falta", async () => {
    const r = await api()
      .post("/api/tienda/pedidos")
      .send({ cliente: { nombre: "Test Gift", telefono: telefonoEscrito(91) }, items: [{ productoId, cantidad: 3 }], giftCard: gc.codigo })
    expect(r.body).toMatchObject({ total: 15000, giftCard: 10000, estado: "pendiente" })
    // Sin saldo ya no sirve: ni para consultarlo ni para comprar.
    expect((await api().get("/api/tienda/gift-cards/saldo").query({ codigo: gc.codigo })).status).toBe(409)
    const otra = await api()
      .post("/api/tienda/pedidos")
      .send({ cliente: { nombre: "Test Gift", telefono: telefonoEscrito(91) }, items: [{ productoId, cantidad: 1 }], giftCard: gc.codigo })
    expect(otra.status).toBe(409)
    // Al cancelar los dos pedidos, el saldo vuelve entero.
    await api().patch(`/api/admin/pedidos/${r.body.id}/estado`).set(auth).send({ estado: "cancelado" })
    await api().patch(`/api/admin/pedidos/${pedidoId}/estado`).set(auth).send({ estado: "cancelado" })
    expect(await saldo(gc.codigo)).toBe(20000)
  })

  it("en la caja: pagar con gift card descuenta el saldo y no suma al total del día; borrarlo lo devuelve", async () => {
    const antes = (await caja()).totales
    const r = await api()
      .post("/api/admin/cobros")
      .set(auth)
      .send({ monto: 5000, medio: "gift_card", concepto: "otro", descripcion: "TEST crema", giftCard: gc.codigo })
    expect(r.status).toBe(201)
    expect(await saldo(gc.codigo)).toBe(15000)
    const despues = (await caja()).totales
    expect(despues.porMedio.gift_card - antes.porMedio.gift_card).toBe(5000)
    expect(despues.total).toBe(antes.total)

    // Sin el código, o pidiendo más de lo que queda, no.
    expect((await api().post("/api/admin/cobros").set(auth).send({ monto: 100, medio: "gift_card", concepto: "otro", descripcion: "TEST" })).status).toBe(400)
    expect((await api().post("/api/admin/cobros").set(auth).send({ monto: 99999, medio: "gift_card", concepto: "otro", descripcion: "TEST", giftCard: gc.codigo })).status).toBe(409)

    expect((await api().delete(`/api/admin/cobros/${r.body.id}`).set(auth)).status).toBe(204)
    expect(await saldo(gc.codigo)).toBe(20000)
  })

  it("la venta de la gift card no se borra desde la caja", async () => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM cobros WHERE gift_card_id = ? AND concepto = 'gift_card'", [gc.id])
    expect((await api().delete(`/api/admin/cobros/${rows[0].id}`).set(auth)).status).toBe(409)
  })

  it("el panel la lista, muestra sus movimientos y la anula si no se usó", async () => {
    const lista = await api().get("/api/admin/gift-cards").set(auth).query({ q: "TEST Comprador" })
    expect(lista.body.some((g: { id: number }) => g.id === gc.id)).toBe(true)
    const d = await api().get(`/api/admin/gift-cards/${gc.id}`).set(auth)
    expect(d.body.movimientos.map((m: { tipo: string }) => m.tipo)).toEqual(["carga", "uso", "uso", "reintegro", "reintegro", "uso", "reintegro"])
    const a = await api().post(`/api/admin/gift-cards/${gc.id}/anular`).set(auth)
    expect(a.body).toMatchObject({ estado: "anulada", saldo: 0 })
    expect((await api().get("/api/tienda/gift-cards/saldo").query({ codigo: gc.codigo })).status).toBe(409)
  })

  it("comprada en la web: el código aparece recién cuando se paga", async () => {
    const [r] = await pool.query<import("mysql2").ResultSetHeader>(
      "INSERT INTO gift_cards (codigo, monto, saldo, estado, origen, comprador_nombre, comprador_telefono, pago_token) VALUES ('TESTWEB2', 15000, 0, 'pendiente_pago', 'web', 'TEST Web', '2235559992', ?)",
      [pagoToken],
    )
    const antes = await api().get(`/api/tienda/gift-cards/pago/${pagoToken}`)
    expect(antes.body).toMatchObject({ estado: "pendiente_pago", monto: 15000, codigo: null })

    await giftCards.aplicarPago(r.insertId, { id: 555000111, aprobado: true, monto: 15000, referencia: `giftcard-${r.insertId}` })
    const despues = await api().get(`/api/tienda/gift-cards/pago/${pagoToken}`)
    expect(despues.body).toMatchObject({ estado: "activa", codigo: "TEST-WEB2" })
    const [cobro] = await pool.query<RowDataPacket[]>("SELECT medio, concepto, monto FROM cobros WHERE mp_pago_id = 555000111")
    expect(cobro[0]).toMatchObject({ medio: "mercadopago", concepto: "gift_card" })
  })

  it("sin Mercado Pago conectado, la compra web avisa que es en el local", async () => {
    const [mp] = await pool.query<RowDataPacket[]>("SELECT 1 FROM mercadopago_cuenta")
    if (mp.length) return
    const r = await api().post("/api/tienda/gift-cards").send({ monto: 10000, comprador: { nombre: "TEST Sin MP", telefono: "2235559993" } })
    expect(r.status).toBe(409)
  })

  it("al completar un turno se puede cobrar con gift card; deshacer el completado devuelve el saldo", async () => {
    const servicio = await servicioCorto()
    const nueva = (await api().post("/api/admin/gift-cards").set(auth).send({ monto: 50000, medio: "debito", comprador: { nombre: "TEST Turno" } })).body
    const clienteId = (await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Gift", telefono: telefonoEscrito(92) })).body.id
    const ayer = new Date(Date.now() - 86_400_000)
    const fecha = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`
    const t = (await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha, hora: "06:30", fueraDeHorario: true })).body
    await api().patch(`/api/admin/turnos/${t.id}/estado`).set(auth).send({ estado: "confirmado" })

    const r = await api().post(`/api/admin/turnos/${t.id}/completar`).set(auth).send({ cobro: { monto: servicio.price, medio: "gift_card", giftCard: nueva.codigo } })
    expect(r.status).toBe(200)
    expect(r.body.cobrado).toBe(servicio.price)
    expect(await saldo(nueva.codigo)).toBe(50000 - servicio.price)

    await api().patch(`/api/admin/turnos/${t.id}/estado`).set(auth).send({ estado: "confirmado" })
    expect(await saldo(nueva.codigo)).toBe(50000)
  })
})
