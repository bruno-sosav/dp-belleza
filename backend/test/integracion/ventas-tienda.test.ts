/** Estadísticas de la tienda por HTTP: solo cuentan los pedidos confirmados o entregados. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, limpiar, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let productoId: number

type Dia = { date: string; shop: number; orderCount: number; services: number; total: number }
type Ranking = { id: number; name: string; count: number; revenue: number; inactive: boolean }

const hoy = async () => {
  const dias = (await api().get("/api/admin/stats/dias").set(auth).query({ dias: 1 })).body.dias as Dia[]
  return dias[0]
}
const ranking = async () => (await api().get("/api/admin/stats/productos").set(auth).query({ dias: 7 })).body as Ranking[]
const delProducto = async () => (await ranking()).find((r) => r.id === productoId)

const comprar = async (cantidad: number, tel: number) =>
  (
    await api()
      .post("/api/tienda/pedidos")
      .send({ cliente: { nombre: "Test Ventas", telefono: telefonoEscrito(tel) }, items: [{ productoId, cantidad }] })
  ).body.id as number
const pasarA = (id: number, estado: string) => api().patch(`/api/admin/pedidos/${id}/estado`).set(auth).send({ estado })

beforeAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  auth = { Authorization: `Bearer ${await token()}` }
  productoId = (await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Ventas", precio: 1000, stock: 50 })).body.id
})
afterAll(async () => {
  await limpiar()
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await cerrar()
})

describe("ventas de la tienda", () => {
  it("un pedido pendiente todavía no cuenta como venta", async () => {
    const antes = await hoy()
    await comprar(2, 80)
    expect(await hoy()).toMatchObject({ shop: antes.shop, orderCount: antes.orderCount })
    expect(await delProducto()).toBeUndefined()
  })

  it("al confirmarlo suma al día de hoy y al ranking de productos", async () => {
    const antes = await hoy()
    const id = await comprar(3, 81)
    await pasarA(id, "confirmado")
    const despues = await hoy()
    expect(despues.shop).toBe(antes.shop + 3000)
    expect(despues.orderCount).toBe(antes.orderCount + 1)
    expect(despues.total).toBe(despues.shop + despues.services)
    expect(await delProducto()).toEqual({ id: productoId, name: "TEST Ventas", count: 3, revenue: 3000, inactive: false })
  })

  it("un pedido cancelado deja de contar", async () => {
    const id = await comprar(1, 82)
    await pasarA(id, "confirmado")
    expect((await delProducto())?.count).toBe(4)
    await pasarA(id, "cancelado")
    expect((await delProducto())?.count).toBe(3)
  })

  it("un producto dado de baja sigue en el ranking, marcado", async () => {
    await api().patch(`/api/admin/productos/${productoId}`).set(auth).send({ activo: false })
    expect((await delProducto())?.inactive).toBe(true)
  })

  it("valida el período y exige sesión", async () => {
    expect((await api().get("/api/admin/stats/productos").set(auth).query({ dias: 0 })).status).toBe(400)
    expect((await api().get("/api/admin/stats/productos")).status).toBe(401)
  })
})
