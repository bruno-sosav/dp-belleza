/** La reserva desde la web: lo que hace la clienta en /reservar. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { api, cerrar, diaAbierto, diaCerrado, horaCerrada, libres, limpiar, masMinutos, servicioCorto, telefono, telefonoEscrito } from "./ayuda.js"

let dia: string
let horas: string[]
let servicio: Awaited<ReturnType<typeof servicioCorto>>

beforeAll(async () => {
  await limpiar()
  servicio = await servicioCorto()
  dia = await diaAbierto(1)
  // Horarios libres separados por más de la duración del servicio, para que no se pisen entre sí.
  horas = []
  for (const h of await libres(servicio.id, dia)) {
    if (!horas.length || h >= masMinutos(horas[horas.length - 1], servicio.durationMin + 15)) horas.push(h)
  }
})
afterAll(cerrar)

const reservar = (hora: string, n = 1, extra: Record<string, unknown> = {}) =>
  api()
    .post("/api/turnos")
    .send({ servicioId: servicio.id, fecha: dia, hora, contacto: { nombreCompleto: "Test Reserva", telefono: telefonoEscrito(n), ...extra } })

describe("reserva web", () => {
  it("hay lugar para probar", () => {
    expect(horas.length).toBeGreaterThanOrEqual(4)
  })

  it("reserva un horario libre y deja de ofrecerlo", async () => {
    const r = await reservar(horas[0])
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ estado: "reservado", fecha: dia, horaInicio: horas[0], precio: servicio.price })
    expect(await libres(servicio.id, dia)).not.toContain(horas[0])
  })

  it("no deja reservar dos veces el mismo horario, ni uno que se pisa en parte (409)", async () => {
    expect((await reservar(horas[0], 2)).status).toBe(409)
    expect((await reservar(masMinutos(horas[0], 15), 2)).status).toBe(409)
  })

  it("rechaza un día cerrado y una hora fuera del horario (409)", async () => {
    const cerrado = await diaCerrado()
    if (cerrado) {
      const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: cerrado, hora: "10:00", contacto: { nombreCompleto: "Test", telefono: telefonoEscrito(3) } })
      expect(r.status).toBe(409)
    }
    expect((await reservar(await horaCerrada(dia), 3)).status).toBe(409)
  })

  it("rechaza el pasado (400)", async () => {
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: "2020-01-06", hora: "10:00", contacto: { nombreCompleto: "Test", telefono: telefonoEscrito(3) } })
    expect(r.status).toBe(400)
  })

  it("la misma clienta con el teléfono escrito distinto no se duplica ni se le pisa el nombre", async () => {
    const r = await api()
      .post("/api/turnos")
      .send({ servicioId: servicio.id, fecha: dia, hora: horas[1], contacto: { nombreCompleto: "Otro Nombre", telefono: telefono(1).slice(3) } })
    expect(r.status).toBe(201)
    const mio = await api().post("/api/turnos/mi-turno").send({ codigo: String(r.body.id), telefono: telefonoEscrito(1) })
    expect(mio.body.nombre).toBe("Test")
  })

  it("guarda el cumpleaños opcional y rechaza uno que no existe", async () => {
    const ok = await reservar(horas[2], 4, { cumple: { dia: 12, mes: 5 } })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    expect((await reservar(horas[3], 5, { cumple: { dia: 30, mes: 2 } })).status).toBe(400)
  })

  it("con DNI: la primera vez se registra, después la saluda y reserva sin pedirle los datos", async () => {
    const dni = "99559906"
    expect((await api().post("/api/turnos/clienta").send({ dni })).body).toEqual({ nombre: null })
    const primera = await api()
      .post("/api/turnos")
      .send({ servicioId: servicio.id, fecha: dia, hora: horas[3], dni, pago: "efectivo", contacto: { nombreCompleto: "Test Reserva", telefono: telefonoEscrito(6) } })
    expect(primera.status, JSON.stringify(primera.body)).toBe(201)
    await api().post("/api/turnos/mi-turno/cancelar").send({ codigo: String(primera.body.id), telefono: telefonoEscrito(6) })

    expect((await api().post("/api/turnos/clienta").send({ dni })).body).toEqual({ nombre: "Test" })
    const segunda = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: horas[3], dni, pago: "efectivo" })
    expect(segunda.status, JSON.stringify(segunda.body)).toBe(201)
    expect(segunda.body.sena).toBeUndefined()
    // Libera el horario para el test del teléfono.
    await api().post("/api/turnos/mi-turno/cancelar").send({ codigo: String(segunda.body.id), telefono: telefonoEscrito(6) })
  })

  it("sin datos y con un DNI que no es de nadie, pide completarlos (400); un DNI mal escrito, también", async () => {
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: horas[3], dni: "99559907", pago: "efectivo" })
    expect(r.status).toBe(400)
    expect((await api().post("/api/turnos/clienta").send({ dni: "12.345" })).status).toBe(400)
  })

  it("rechaza un teléfono con un dígito de más", async () => {
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: horas[3], contacto: { nombreCompleto: "Test", telefono: "22355599011" } })
    expect(r.status).toBe(400)
  })
})
