/** Recordatorios: quién aparece en "Para mandar" según cada tipo. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { anotarTipo, api, cerrar, limpiar, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }
let clienteId: number

/** "YYYY-MM-DD" de hoy + n días, en hora local. */
const enDias = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type Aviso = { tipo: { id: number }; cliente: { id: number }; registro: Record<string, unknown> }
const paraMandar = async () => (await api().get("/api/admin/recordatorios").set(auth)).body.paraMandar as Aviso[]

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
  const c = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Recordatorio", telefono: telefonoEscrito(50) })
  clienteId = c.body.id
})
afterAll(cerrar)

describe("recordatorios", () => {
  it("valida cada momento con su dato", async () => {
    const mal = await api().post("/api/admin/recordatorios/tipos").set(auth).send({ momento: "despues", horasAntes: 5, nombre: "x", mensaje: "un mensaje largo" })
    expect(mal.status).toBe(400)
  })

  it("después de la visita: aparece a los X días, y no si ya tiene otro turno pedido", async () => {
    const servicio = await servicioCorto()
    const visita = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: enDias(-3), hora: "06:00", fueraDeHorario: true })
    expect(visita.status).toBe(201)
    expect(visita.body.estado).toBe("completado")

    const tipo = await api().post("/api/admin/recordatorios/tipos").set(auth).send({ momento: "despues", dias: 3, servicioId: servicio.id, nombre: "TEST volver", mensaje: "Hola {nombre}, ¿volvés por {servicio}?" })
    expect(tipo.status).toBe(201)
    anotarTipo(tipo.body.id)

    const aviso = (await paraMandar()).find((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)
    expect(aviso).toBeDefined()

    // con un turno pedido ya no hace falta recordarle
    const futuro = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: enDias(40), hora: "06:00", fueraDeHorario: true })
    expect(futuro.status).toBe(201)
    expect((await paraMandar()).some((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)).toBe(false)
    await api().patch(`/api/admin/turnos/${futuro.body.id}/estado`).set(auth).send({ estado: "cancelado" })
    expect((await paraMandar()).some((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)).toBe(true)
  })

  it("cumpleaños: aparece dentro de los días configurados; mandado, no vuelve a aparecer; deshacer lo devuelve", async () => {
    const manana = enDias(1)
    await api().patch(`/api/admin/clientes/${clienteId}`).set(auth).send({ cumple: { dia: Number(manana.slice(8)), mes: Number(manana.slice(5, 7)) } })
    const tipo = await api().post("/api/admin/recordatorios/tipos").set(auth).send({ momento: "cumpleanos", dias: 2, nombre: "TEST cumple", mensaje: "¡Feliz cumple {nombre}!" })
    anotarTipo(tipo.body.id)

    const aviso = (await paraMandar()).find((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)
    expect(aviso).toBeDefined()

    const reg = await api().post("/api/admin/recordatorios").set(auth).send({ ...aviso!.registro, estado: "enviado" })
    expect(reg.status).toBe(201)
    expect((await paraMandar()).some((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)).toBe(false)

    expect((await api().delete(`/api/admin/recordatorios/${reg.body.id}`).set(auth)).status).toBe(204)
    expect((await paraMandar()).some((a) => a.tipo.id === tipo.body.id && a.cliente.id === clienteId)).toBe(true)
  })
})
