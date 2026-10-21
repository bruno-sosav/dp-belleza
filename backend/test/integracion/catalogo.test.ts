/** Catálogo por HTTP: servicios (web y panel), productos y categorías. Nada de esto tenía tests antes. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, limpiar, token } from "./ayuda.js"

let auth: { Authorization: string }

async function borrarDePrueba() {
  await pool.query("DELETE FROM servicios WHERE nombre LIKE 'TEST %'")
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await pool.query("DELETE FROM categorias WHERE nombre LIKE 'TEST %'")
}

beforeAll(async () => {
  await limpiar()
  await borrarDePrueba()
  auth = { Authorization: `Bearer ${await token()}` }
})
afterAll(async () => {
  await borrarDePrueba()
  await cerrar()
})

describe("servicios", () => {
  let id: number
  it("el panel crea un servicio y la categoría se unifica con la existente", async () => {
    const existente = (await api().get("/api/turnos/servicios")).body[0].category as string
    const r = await api().post("/api/admin/servicios").set(auth).send({ name: "TEST Masaje", category: `  ${existente.toUpperCase()} `, price: 1000, durationMin: 30 })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ name: "TEST Masaje", category: existente, activo: true, turnosProximos: 0 })
    id = r.body.id
  })

  it("la web lo ve con la forma de siempre (sin campos del panel)", async () => {
    const r = await api().get(`/api/turnos/servicios/${id}`)
    expect(r.body).toMatchObject({ id, name: "TEST Masaje", price: 1000, durationMin: 30, includes: [] })
    expect(r.body).not.toHaveProperty("activo")
    expect(r.body).not.toHaveProperty("turnosProximos")
  })

  it("pausado, desaparece de la web pero sigue en el panel", async () => {
    await api().patch(`/api/admin/servicios/${id}`).set(auth).send({ activo: false })
    expect((await api().get(`/api/turnos/servicios/${id}`)).status).toBe(404)
    expect(((await api().get("/api/turnos/servicios")).body as { id: number }[]).some((s) => s.id === id)).toBe(false)
    expect((await api().get(`/api/admin/servicios/${id}`).set(auth)).body).toMatchObject({ activo: false })
  })

  it("valida lo que entra", async () => {
    expect((await api().post("/api/admin/servicios").set(auth).send({ name: "TEST x", category: "x", price: 1, durationMin: 1 })).status).toBe(400)
  })
})

describe("tienda", () => {
  it("categorías y productos: el panel ve todo; la tienda, solo si hay stock (no cuánto)", async () => {
    const cat = await api().post("/api/admin/categorias").set(auth).send({ nombre: "TEST Cremas" })
    expect(cat.status).toBe(201)
    const p = await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST Crema", precio: 1500, stock: 3, categoriaId: cat.body.id })
    expect(p.status).toBe(201)
    expect(p.body).toMatchObject({ stock: 3, activo: true, categoria: { id: cat.body.id, nombre: "TEST Cremas" } })

    const web = await api().get(`/api/tienda/productos/${p.body.id}`)
    expect(web.body).toMatchObject({ nombre: "TEST Crema", disponible: true })
    expect(web.body).not.toHaveProperty("stock")
    expect(web.body).not.toHaveProperty("activo")

    // El stock lo cambia el inventario, no la edición del producto.
    await api().put(`/api/admin/productos/${p.body.id}/stock`).set(auth).send({ stock: 0 })
    expect((await api().get(`/api/tienda/productos/${p.body.id}`)).body.disponible).toBe(false)

    const filtrados = (await api().get("/api/tienda/productos").query({ categoria: cat.body.id })).body as { id: number }[]
    expect(filtrados.map((x) => x.id)).toEqual([p.body.id])

    await api().patch(`/api/admin/productos/${p.body.id}`).set(auth).send({ activo: false })
    expect((await api().get(`/api/tienda/productos/${p.body.id}`)).status).toBe(404)
  })

  it("no deja crear un producto con una categoría que no existe", async () => {
    expect((await api().post("/api/admin/productos").set(auth).send({ nombre: "TEST x", precio: 1, stock: 1, categoriaId: 999999 })).status).toBe(400)
  })
})
