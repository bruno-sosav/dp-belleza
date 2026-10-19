/** Clientas: alta con teléfonos escritos de cualquier forma, duplicados y unir fichas. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.js"
import { api, cerrar, diaAbierto, libres, limpiar, servicioCorto, telefono, token } from "./ayuda.js"

let auth: { Authorization: string }

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
})
afterAll(cerrar)

describe("clientas", () => {
  it("completa el código de área del local si no lo pusieron", async () => {
    const r = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", telefono: "15 555-9940" })
    expect(r.status).toBe(201)
    expect(r.body.telefono).toBe(telefono(40))
  })

  it("no deja dos fichas con el mismo teléfono, aunque esté escrito distinto", async () => {
    const r = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Otra", telefono: "0223-5559940" })
    expect(r.status).toBe(409)
  })

  it("rechaza un cumpleaños que no existe", async () => {
    const r = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", telefono: "223 555 9941", cumple: { dia: 31, mes: 4 } })
    expect(r.status).toBe(400)
  })

  it("une dos fichas: pasa los turnos, completa datos y se queda con el teléfono elegido", async () => {
    const a = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Unir", telefono: "223 555 9942", notas: "nota A" })
    const b = await api()
      .post("/api/admin/clientes")
      .set(auth)
      .send({ nombre: "Test", apellido: "Unir", telefono: "223 555 9943", email: "test-unir@ejemplo.com", cumple: { dia: 3, mes: 3 }, notas: "nota B" })
    const servicio = await servicioCorto()
    const dia = await diaAbierto(5)
    const t = await api().post("/api/admin/turnos").set(auth).send({ clienteId: b.body.id, servicioId: servicio.id, fecha: dia, hora: (await libres(servicio.id, dia))[0] })
    expect(t.status).toBe(201)

    // Un cobro de la caja de la ficha que se va a borrar (antes quedaba sin clienta al unir).
    const cobro = await api().post("/api/admin/cobros").set(auth).send({ monto: 500, medio: "efectivo", concepto: "turno", turnoId: t.body.id })
    expect(cobro.status).toBe(201)

    const sugeridas = await api().get(`/api/admin/clientes/${a.body.id}/posibles-duplicados`).set(auth)
    expect(sugeridas.body.map((x: { id: number }) => x.id)).toContain(b.body.id)

    const u = await api().post(`/api/admin/clientes/${a.body.id}/unir`).set(auth).send({ otraId: b.body.id, telefonoDe: "otra" })
    expect(u.body).toMatchObject({ turnos: 1, compras: 0 })

    const ficha = await api().get(`/api/admin/clientes/${a.body.id}`).set(auth)
    expect(ficha.body).toMatchObject({ telefono: telefono(43), email: "test-unir@ejemplo.com", cumple: { dia: 3, mes: 3 } })
    expect(ficha.body.notas).toContain("nota A")
    expect(ficha.body.notas).toContain("nota B")
    expect(ficha.body.turnos.map((x: { id: number }) => x.id)).toContain(t.body.id)
    expect((await api().get(`/api/admin/clientes/${b.body.id}`).set(auth)).status).toBe(404)
    const [[c]] = await pool.query<RowDataPacket[]>("SELECT cliente_id FROM cobros WHERE id = ?", [cobro.body.id])
    expect(c.cliente_id).toBe(a.body.id)
  })

  it("no une una ficha consigo misma", async () => {
    const a = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", telefono: "223 555 9944" })
    expect((await api().post(`/api/admin/clientes/${a.body.id}/unir`).set(auth).send({ otraId: a.body.id })).status).toBe(400)
  })
})
