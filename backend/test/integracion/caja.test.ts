/** Caja: completar un turno cobrando, cobros a mano, sin cobrar y la seña de Mercado Pago. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.js"
import { turnos } from "../../src/modules/appointments/appointments.module.js"
import { api, cerrar, diaAbierto, libres, limpiar, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let clienteId: number
let servicio: Awaited<ReturnType<typeof servicioCorto>>

const ayer = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
})()

const caja = async (fecha?: string) => (await api().get("/api/admin/caja").set(auth).query(fecha ? { fecha } : {})).body

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
  servicio = await servicioCorto()
  clienteId = (await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Caja", telefono: telefonoEscrito(90) })).body.id
})
afterAll(cerrar)

describe("caja", () => {
  it("no deja completar un turno que no empezó", async () => {
    const dia = await diaAbierto(10)
    const t = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: dia, hora: (await libres(servicio.id, dia))[0] })
    const r = await api().post(`/api/admin/turnos/${t.body.id}/completar`).set(auth).send({ cobro: { monto: 1000, medio: "efectivo" } })
    expect(r.status).toBe(400)
  })

  let turnoId: number
  it("un turno completado sin cobrar aparece en 'sin cobrar' de su día", async () => {
    const t = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: ayer, hora: "06:00", fueraDeHorario: true })
    expect(t.body.estado).toBe("completado")
    turnoId = t.body.id
    const c = await caja(ayer)
    expect(c.sinCobrar.find((x: { turnoId: number }) => x.turnoId === turnoId)).toMatchObject({ falta: servicio.price })
  })

  it("completar cobrando anota el cobro; deshacer el completado lo saca", async () => {
    await api().patch(`/api/admin/turnos/${turnoId}/estado`).set(auth).send({ estado: "confirmado" })
    const r = await api().post(`/api/admin/turnos/${turnoId}/completar`).set(auth).send({ cobro: { monto: servicio.price, medio: "debito" } })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ estado: "completado", cobrado: servicio.price })
    expect((await caja(ayer)).sinCobrar.some((x: { turnoId: number }) => x.turnoId === turnoId)).toBe(false)
    const hoy = await caja()
    expect(hoy.cobros.some((x: { turno: { id: number } | null; medio: string }) => x.turno?.id === turnoId && x.medio === "debito")).toBe(true)

    const d = await api().patch(`/api/admin/turnos/${turnoId}/estado`).set(auth).send({ estado: "confirmado" })
    expect(d.body.cobrado).toBe(0)
  })

  it("completar sin cobrar ('todavía no cobré') y cobrar después, en partes", async () => {
    const r = await api().post(`/api/admin/turnos/${turnoId}/completar`).set(auth).send({ cobro: null })
    expect(r.body).toMatchObject({ estado: "completado", cobrado: 0 })
    await api().post("/api/admin/cobros").set(auth).send({ monto: 1000, medio: "efectivo", concepto: "turno", turnoId })
    expect((await caja(ayer)).sinCobrar.find((x: { turnoId: number }) => x.turnoId === turnoId)).toMatchObject({ falta: servicio.price - 1000 })
  })

  it("los totales del día suman por medio de pago", async () => {
    const antes = (await caja()).totales
    await api().post("/api/admin/cobros").set(auth).send({ monto: 2500, medio: "transferencia", concepto: "otro", descripcion: "TEST gift card" })
    const despues = (await caja()).totales
    expect(despues.porMedio.transferencia - antes.porMedio.transferencia).toBe(2500)
    expect(despues.total - antes.total).toBe(2500)
  })

  it("valida: 'otro' pide descripción; 'turno' pide el turno", async () => {
    expect((await api().post("/api/admin/cobros").set(auth).send({ monto: 100, medio: "efectivo", concepto: "otro" })).status).toBe(400)
    expect((await api().post("/api/admin/cobros").set(auth).send({ monto: 100, medio: "efectivo", concepto: "turno" })).status).toBe(400)
    expect((await api().post("/api/admin/cobros").set(auth).send({ monto: -5, medio: "efectivo", concepto: "otro", descripcion: "TEST" })).status).toBe(400)
  })

  it("se puede borrar un cobro anotado por error", async () => {
    const r = await api().post("/api/admin/cobros").set(auth).send({ monto: 100, medio: "efectivo", concepto: "otro", descripcion: "TEST error" })
    expect((await api().delete(`/api/admin/cobros/${r.body.id}`).set(auth)).status).toBe(204)
  })

  it("la seña de Mercado Pago entra sola a la caja, una sola vez, y no se puede borrar", async () => {
    const dia = await diaAbierto(11)
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: (await libres(servicio.id, dia))[0], contacto: { nombreCompleto: "Test Caja", telefono: telefonoEscrito(91) } })
    await pool.query("UPDATE turnos SET sena_monto = 1500, sena_estado = 'pendiente', sena_vence_at = NOW() + INTERVAL 30 MINUTE, sena_token = ? WHERE id = ?", ["f".repeat(32), r.body.id])
    const pago = { id: 987654321, aprobado: true, monto: 1500, referencia: `turno-${r.body.id}` }
    await turnos.aplicarPagoSena(r.body.id, pago)
    await turnos.aplicarPagoSena(r.body.id, pago) // llega dos veces (webhook + vuelta)
    const [cobros] = await pool.query<RowDataPacket[]>("SELECT id, medio, concepto, monto FROM cobros WHERE turno_id = ?", [r.body.id])
    expect(cobros).toHaveLength(1)
    expect(cobros[0]).toMatchObject({ medio: "mercadopago", concepto: "sena", monto: 1500 })
    expect((await api().delete(`/api/admin/cobros/${cobros[0].id}`).set(auth)).status).toBe(409)
  })
})
