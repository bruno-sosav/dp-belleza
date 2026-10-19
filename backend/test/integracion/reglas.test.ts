/** Reglas de la reserva web: anticipación máxima, tope por clienta, límite por conexión y la confirmación con token. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { api, cerrar, diaAbierto, libres, limpiar, ponerConfig, servicioCorto, telefonoEscrito } from "./ayuda.js"

let servicioId: number
let dia: string
let horas: string[]

beforeAll(async () => {
  await limpiar()
  servicioId = (await servicioCorto()).id
  dia = await diaAbierto(9)
  const todas = await libres(servicioId, dia)
  // separadas (los slots van cada 15 min y el servicio dura más), para que ninguna se pise con otra
  horas = todas.filter((_, i) => i % 3 === 0)
  if (horas.length < 8) throw new Error(`Ese día hay pocos horarios libres para el test (${horas.length})`)
})
afterAll(cerrar)

const reservar = (hora: string, tel: number) =>
  api().post("/api/turnos").send({ servicioId, fecha: dia, hora, contacto: { nombreCompleto: "Test Reglas", telefono: telefonoEscrito(tel) } })

describe("reglas de la reserva web", () => {
  it("no deja reservar más allá de los días configurados, ni lo ofrece", async () => {
    await ponerConfig("reserva_anticipacion_max_dias", "60")
    try {
      const r = await reservar(horas[0], 80)
      expect(r.status).toBe(400)
      expect(r.body.error).toMatch(/60 días/)
      expect(await libres(servicioId, dia)).toEqual([])
    } finally {
      await ponerConfig("reserva_anticipacion_max_dias", "4000")
    }
  })

  it("la confirmación se puede volver a ver con el token (sobrevive a un F5)", async () => {
    const r = await reservar(horas[0], 81)
    expect(r.status).toBe(201)
    expect(r.body.token).toMatch(/^[0-9a-f]{32}$/)
    const c = await api().get(`/api/turnos/reserva/${r.body.token}`)
    expect(c.body).toMatchObject({ id: r.body.id, fecha: dia, horaInicio: horas[0], cliente: { nombre: "Test Reglas" } })
    expect((await api().get(`/api/turnos/reserva/${"e".repeat(32)}`)).status).toBe(404)
  })

  it("una misma clienta no puede tener más de 3 turnos pedidos desde la web", async () => {
    expect((await reservar(horas[1], 82)).status).toBe(201)
    expect((await reservar(horas[2], 82)).status).toBe(201)
    expect((await reservar(horas[3], 82)).status).toBe(201)
    const cuarto = await reservar(horas[4], 82)
    expect(cuarto.status).toBe(409)
    expect(cuarto.body.error).toMatch(/3 turnos/)
  })

  it("una misma conexión no puede hacer más de 6 reservas por hora (los errores no cuentan)", async () => {
    // Ya van 4 reservas buenas en este archivo (y 3 con error, que no cuentan).
    expect((await reservar(horas[5], 83)).status).toBe(201)
    expect((await reservar(horas[6], 84)).status).toBe(201)
    expect((await reservar(horas[7], 85)).status).toBe(429)
  })
})
