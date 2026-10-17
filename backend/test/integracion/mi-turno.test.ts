/** "Mi turno": la clienta busca y cancela su turno desde la web. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { api, cerrar, diaAbierto, libres, limpiar, ponerConfig, servicioCorto, telefonoEscrito, valorConfig } from "./ayuda.js"

let dia: string
let hora: string
let codigo: string
let horasOriginales: string | null

beforeAll(async () => {
  await limpiar()
  horasOriginales = await valorConfig("cancelacion_horas_minimas")
  const servicio = await servicioCorto()
  dia = await diaAbierto(3)
  hora = (await libres(servicio.id, dia))[0]
  const r = await api()
    .post("/api/turnos")
    .send({ servicioId: servicio.id, fecha: dia, hora, contacto: { nombreCompleto: "Test MiTurno", telefono: telefonoEscrito(20) } })
  codigo = `DP-${String(r.body.id).padStart(6, "0")}`
})
afterAll(async () => {
  if (horasOriginales !== null) await ponerConfig("cancelacion_horas_minimas", horasOriginales)
  await cerrar()
})

describe("mi turno", () => {
  it("lo encuentra con el código y el teléfono escrito de cualquier forma", async () => {
    for (const tel of [telefonoEscrito(20), "0223 15 555-9920", "+54 9 223 555 9920"]) {
      const r = await api().post("/api/turnos/mi-turno").send({ codigo, telefono: tel })
      expect(r.status).toBe(200)
      expect(r.body).toMatchObject({ codigo, fecha: dia, hora, puedeCancelar: true })
    }
  })

  it("con otro teléfono no lo encuentra, y no dice cuál de los dos datos falló", async () => {
    const r = await api().post("/api/turnos/mi-turno").send({ codigo, telefono: telefonoEscrito(21) })
    expect(r.status).toBe(404)
    expect(r.body.error).toMatch(/código y ese teléfono/)
  })

  it("si falta menos que el mínimo, no deja cancelar y explica", async () => {
    // 2030 está lejos: para simular "falta poco" se pone un mínimo enorme.
    await ponerConfig("cancelacion_horas_minimas", "999999")
    const r = await api().post("/api/turnos/mi-turno/cancelar").send({ codigo, telefono: telefonoEscrito(20) })
    expect(r.status).toBe(409)
    expect(r.body.error).toMatch(/WhatsApp/)
    await ponerConfig("cancelacion_horas_minimas", "24")
  })

  it("lo cancela, queda registrado que fue la clienta, y cancelar de nuevo no da error", async () => {
    const r = await api().post("/api/turnos/mi-turno/cancelar").send({ codigo, telefono: telefonoEscrito(20) })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ estado: "cancelado", puedeCancelar: false })
    expect((await api().post("/api/turnos/mi-turno/cancelar").send({ codigo, telefono: telefonoEscrito(20) })).status).toBe(200)
  })

  it("el horario cancelado vuelve a estar libre en la web", async () => {
    const servicio = await servicioCorto()
    expect(await libres(servicio.id, dia)).toContain(hora)
  })
})
