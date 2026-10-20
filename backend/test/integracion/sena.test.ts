/**
 * Seña: el ciclo del turno esperando el pago. No hay credenciales reales de
 * Mercado Pago en los tests, así que el turno con seña se arma directo en la
 * base y el pago se simula con un objeto como el que devuelve Mercado Pago.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.js"
import { turnos } from "../../src/modules/appointments/appointments.module.js"
import { api, cerrar, diaAbierto, libres, limpiar, ponerConfig, servicioCorto, telefonoEscrito, valorConfig } from "./ayuda.js"

let dia: string
let hora: string
let servicioId: number
let porcentajeOriginal: string | null
const token = "a".repeat(32)

const pagoAprobado = (turnoId: number, monto: number) => ({
  id: 123456789,
  aprobado: true,
  monto,
  referencia: `turno-${turnoId}`,
})

beforeAll(async () => {
  await limpiar()
  porcentajeOriginal = await valorConfig("sena_porcentaje")
  const s = await servicioCorto()
  servicioId = s.id
  dia = await diaAbierto(6)
  hora = (await libres(servicioId, dia))[0]
})
afterAll(async () => {
  if (porcentajeOriginal !== null) await ponerConfig("sena_porcentaje", porcentajeOriginal)
  await cerrar()
})

describe("seña", () => {
  it("sin Mercado Pago conectado, aunque haya porcentaje, la reserva no pide seña", async () => {
    const [mp] = await pool.query<RowDataPacket[]>("SELECT 1 FROM mercadopago_cuenta")
    if (mp.length) return // con una cuenta conectada este caso no aplica
    await ponerConfig("sena_porcentaje", "30")
    const conf = await api().get("/api/configuracion")
    expect(conf.body.senaPorcentaje).toBe(0)
    const r = await api().post("/api/turnos").send({ servicioId, fecha: dia, hora, contacto: { nombreCompleto: "Test Sena", telefono: telefonoEscrito(60) } })
    expect(r.status).toBe(201)
    expect(r.body.sena).toBeUndefined()
    await pool.query("DELETE FROM turnos WHERE id = ?", [r.body.id])
  })

  let turnoId: number
  it("un turno con la seña pendiente ocupa el horario y se consulta con el token", async () => {
    const r = await api().post("/api/turnos").send({ servicioId, fecha: dia, hora, contacto: { nombreCompleto: "Test Sena", telefono: telefonoEscrito(61) } })
    turnoId = r.body.id
    await pool.query(
      "UPDATE turnos SET sena_monto = 1000, sena_estado = 'pendiente', sena_vence_at = NOW() + INTERVAL 30 MINUTE, sena_token = ? WHERE id = ?",
      [token, turnoId],
    )
    expect(await libres(servicioId, dia)).not.toContain(hora)
    const s = await api().get(`/api/turnos/sena/${token}`)
    expect(s.body).toMatchObject({ estado: "reservado", sena: { monto: 1000, estado: "pendiente" } })
  })

  it("si vence sin pagar, el horario se libera enseguida y después queda cancelado por el sistema", async () => {
    await pool.query("UPDATE turnos SET sena_vence_at = NOW() - INTERVAL 1 MINUTE WHERE id = ?", [turnoId])
    expect(await libres(servicioId, dia)).toContain(hora)
    expect(await turnos.vencerSenas()).toBeGreaterThanOrEqual(1)
    const s = await api().get(`/api/turnos/sena/${token}`)
    expect(s.body).toMatchObject({ estado: "cancelado", sena: { estado: "vencida" } })
    expect((await api().post(`/api/turnos/sena/${token}/pagar`)).status).toBe(409)
  })

  it("si paga tarde y el horario sigue libre, el turno se recupera confirmado", async () => {
    await turnos.aplicarPagoSena(turnoId, pagoAprobado(turnoId, 1000))
    const s = await api().get(`/api/turnos/sena/${token}`)
    expect(s.body).toMatchObject({ estado: "confirmado", sena: { estado: "pagada" } })
    expect(await libres(servicioId, dia)).not.toContain(hora)
  })

  it("un pago de menos o no aprobado no confirma nada", async () => {
    const r = await api().post("/api/turnos").send({ servicioId, fecha: dia, hora: (await libres(servicioId, dia))[0], contacto: { nombreCompleto: "Test Sena", telefono: telefonoEscrito(62) } })
    await pool.query("UPDATE turnos SET sena_monto = 1000, sena_estado = 'pendiente', sena_vence_at = NOW() + INTERVAL 30 MINUTE, sena_token = ? WHERE id = ?", ["b".repeat(32), r.body.id])
    await turnos.aplicarPagoSena(r.body.id, pagoAprobado(r.body.id, 500))
    await turnos.aplicarPagoSena(r.body.id, { ...pagoAprobado(r.body.id, 1000), aprobado: false })
    const s = await api().get(`/api/turnos/sena/${"b".repeat(32)}`)
    expect(s.body).toMatchObject({ estado: "reservado", sena: { estado: "pendiente" } })
  })

  it("un token que no existe da 404", async () => {
    expect((await api().get(`/api/turnos/sena/${"c".repeat(32)}`)).status).toBe(404)
  })
})
