/** Pago de un pedido con Mercado Pago. Sin credenciales reales: el pedido se marca "esperando pago" en la base y el pago se simula. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.database.js"
import { pedidos } from "../../src/modules/orders/orders.module.js"
import { api, cerrar, limpiar, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number
let pedidoId: number
const pagoToken = "b".repeat(32)
const pago = (monto: number) => ({ id: 987654321, aprobado: true, monto, referencia: `pedido-${pedidoId}` })

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Pago", precio: 2500, stock: 5 })).body.id
})
afterAll(async () => {
  await pool.query("DELETE FROM cobros WHERE mp_pago_id = 987654321")
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("pago de un pedido", () => {
  it("sin Mercado Pago conectado, el pedido no pide pago", async () => {
    const [mp] = await pool.query<RowDataPacket[]>("SELECT 1 FROM mercadopago_cuenta")
    const r = await api()
      .post("/api/tienda/pedidos")
      .send({ cliente: { nombre: "Test Pago", telefono: telefonoEscrito(90) }, items: [{ productoId, cantidad: 2 }] })
    expect(r.status).toBe(201)
    pedidoId = r.body.id
    if (!mp.length) expect(r.body.pagoToken).toBeNull()
    // Lo que haría el checkout con Mercado Pago conectado:
    await pool.query("UPDATE pedidos SET pago_estado = 'pendiente', pago_token = ? WHERE id = ?", [pagoToken, pedidoId])
  })

  it("con el token se ve cómo quedó, sin datos de la clienta", async () => {
    const r = await api().get(`/api/tienda/pedidos/pago/${pagoToken}`)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: pedidoId, estado: "pendiente", pagoEstado: "pendiente", total: 5000 })
    expect(r.body).not.toHaveProperty("cliente")
    expect((await api().get(`/api/tienda/pedidos/pago/${"c".repeat(32)}`)).status).toBe(404)
    expect((await api().get("/api/tienda/pedidos/pago/no-es-un-token")).status).toBe(400)
  })

  it("sin cuenta de Mercado Pago, pedir el link avisa que no está configurado", async () => {
    const [mp] = await pool.query<RowDataPacket[]>("SELECT 1 FROM mercadopago_cuenta")
    if (mp.length) return // con una cuenta conectada este caso no aplica
    const r = await api().post(`/api/tienda/pedidos/pago/${pagoToken}/pagar`)
    expect(r.status).toBe(409)
  })

  it("un pago de menos no hace nada", async () => {
    await pedidos.aplicarPago(pedidoId, pago(100))
    expect((await api().get(`/api/tienda/pedidos/pago/${pagoToken}`)).body.pagoEstado).toBe("pendiente")
  })

  it("el pago aprobado confirma el pedido y entra a la caja una sola vez", async () => {
    await pedidos.aplicarPago(pedidoId, pago(5000))
    await pedidos.aplicarPago(pedidoId, pago(5000)) // el aviso puede llegar dos veces
    expect((await api().get(`/api/tienda/pedidos/pago/${pagoToken}`)).body).toMatchObject({ estado: "confirmado", pagoEstado: "pagado" })
    const [cobros] = await pool.query<RowDataPacket[]>("SELECT concepto, medio, monto, pedido_id FROM cobros WHERE mp_pago_id = 987654321")
    expect(cobros).toEqual([{ concepto: "pedido", medio: "mercadopago", monto: 5000, pedido_id: pedidoId }])
  })

  it("el panel ve el pedido pagado, y en la caja figura como pedido", async () => {
    expect((await api().get(`/api/admin/pedidos/${pedidoId}`).set(auth)).body.pagoEstado).toBe("pagado")
    const caja = await api().get("/api/admin/caja").set(auth)
    const cobro = (caja.body.cobros as { concepto: string; descripcion: string }[]).find((c) => c.descripcion === `Pedido #${pedidoId} de la tienda`)
    expect(cobro?.concepto).toBe("pedido")
  })

  it("ya pagado, no se puede pedir otro link", async () => {
    expect((await api().post(`/api/tienda/pedidos/pago/${pagoToken}/pagar`)).status).toBe(409)
  })
})
