/** Horario de atención y días cerrados (bloqueos). */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { anotarBloqueo, api, cerrar, diaAbierto, libres, limpiar, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let dia: string
let auth: { Authorization: string }

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
  dia = await diaAbierto(4)
})
afterAll(cerrar)

describe("horario de atención", () => {
  it("rechaza dos franjas del mismo día que se pisan, sin tocar el horario guardado", async () => {
    const antes = await api().get("/api/turnos/horarios")
    const r = await api()
      .put("/api/admin/horarios")
      .set(auth)
      .send({ franjas: [{ diaSemana: 1, desde: "09:00", hasta: "14:00" }, { diaSemana: 1, desde: "13:00", hasta: "19:00" }] })
    expect(r.status).toBe(400)
    expect((await api().get("/api/turnos/horarios")).body).toEqual(antes.body)
  })
})

describe("días cerrados", () => {
  it("cerrar un día: la web deja de ofrecerlo y avisa qué turnos quedan adentro", async () => {
    const servicio = await servicioCorto()
    const [h0, , h2] = await libres(servicio.id, dia)
    const t = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: h0, contacto: { nombreCompleto: "Test Agenda", telefono: telefonoEscrito(30) } })
    expect(t.status).toBe(201)

    const sig = new Date(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8)) + 1)
    const siguiente = `${sig.getFullYear()}-${String(sig.getMonth() + 1).padStart(2, "0")}-${String(sig.getDate()).padStart(2, "0")}`
    const b = await api().post("/api/admin/bloqueos").set(auth).send({ desde: `${dia} 00:00`, hasta: `${siguiente} 00:00`, motivo: "TEST feriado" })
    expect(b.status).toBe(201)
    anotarBloqueo(b.body.bloqueo.id)
    expect(b.body.turnosAfectados.map((x: { id: number }) => x.id)).toContain(t.body.id)

    const d = await api().get("/api/turnos/disponibilidad").query({ servicioId: servicio.id, fecha: dia })
    expect(d.body.some((s: { available: boolean }) => s.available)).toBe(false)

    // y no se puede reservar encima
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: h2, contacto: { nombreCompleto: "Test", telefono: telefonoEscrito(31) } })
    expect(r.status).toBe(409)

    // al quitarlo vuelve
    expect((await api().delete(`/api/admin/bloqueos/${b.body.bloqueo.id}`).set(auth)).status).toBe(204)
    const d2 = await api().get("/api/turnos/disponibilidad").query({ servicioId: servicio.id, fecha: dia })
    expect(d2.body.some((s: { available: boolean }) => s.available)).toBe(true)
  })

  it("no deja cerrar un período que ya pasó", async () => {
    const r = await api().post("/api/admin/bloqueos").set(auth).send({ desde: "2020-01-01 10:00", hasta: "2020-01-01 11:00" })
    expect(r.status).toBe(400)
  })
})
