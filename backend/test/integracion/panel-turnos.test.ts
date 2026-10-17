/** Turnos desde el panel: dar, reprogramar, corregir, marcar y cancelar. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { api, cerrar, diaAbierto, horaCerrada, libres, limpiar, masMinutos, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let dia: string
let h: string[]
let auth: { Authorization: string }
let servicio: Awaited<ReturnType<typeof servicioCorto>>
let clienteId: number

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
  servicio = await servicioCorto()
  const c = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", apellido: "Panel", telefono: telefonoEscrito(10) })
  clienteId = c.body.id
  dia = await diaAbierto(2)
  h = await libres(servicio.id, dia)
})
afterAll(cerrar)

describe("panel: turnos", () => {
  it("sin sesión no deja entrar (401)", async () => {
    expect((await api().get("/api/admin/turnos")).status).toBe(401)
  })

  let id: number
  it("da un turno: entra confirmado", async () => {
    const r = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: dia, hora: h[0] })
    expect(r.status).toBe(201)
    expect(r.body.estado).toBe("confirmado")
    id = r.body.id
  })

  it("la disponibilidad del panel muestra libre el horario del propio turno al reprogramarlo", async () => {
    const sin = await api().get("/api/admin/turnos/disponibilidad").set(auth).query({ servicioId: servicio.id, fecha: dia })
    const con = await api().get("/api/admin/turnos/disponibilidad").set(auth).query({ servicioId: servicio.id, fecha: dia, excluir: id })
    const a10 = (b: { time: string; available: boolean }[]) => b.find((s) => s.time === h[0])?.available
    expect(a10(sin.body)).toBe(false)
    expect(a10(con.body)).toBe(true)
  })

  it("reprograma 15 minutos (se pisa consigo mismo, igual se puede)", async () => {
    const r = await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ hora: masMinutos(h[0], 15) })
    expect(r.status).toBe(200)
    expect(r.body.horaInicio).toBe(masMinutos(h[0], 15))
  })

  it("no reprograma al pasado ni fuera de horario sin permiso; con permiso, sí", async () => {
    expect((await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ fecha: "2020-01-06" })).status).toBe(400)
    const fuera = await horaCerrada(dia)
    expect((await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ hora: fuera })).status).toBe(409)
    const ok = await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ hora: fuera, fueraDeHorario: true })
    expect(ok.status).toBe(200)
    await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ hora: h[0] })
  })

  it("no deja pisar otro turno", async () => {
    const libre = (await libres(servicio.id, dia)).find((x) => x >= masMinutos(h[0], servicio.durationMin))!
    const otro = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: dia, hora: libre })
    expect(otro.status).toBe(201)
    expect((await api().patch(`/api/admin/turnos/${otro.body.id}`).set(auth).send({ hora: h[0] })).status).toBe(409)
  })

  it("no marca completado un turno que no empezó", async () => {
    expect((await api().patch(`/api/admin/turnos/${id}/estado`).set(auth).send({ estado: "completado" })).status).toBe(400)
  })

  it("al cancelar registra que fue el local, y ya no se puede mover (solo la nota)", async () => {
    const c = await api().patch(`/api/admin/turnos/${id}/estado`).set(auth).send({ estado: "cancelado" })
    expect(c.body).toMatchObject({ estado: "cancelado", canceladoPor: "local" })
    expect((await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ hora: masMinutos(h[0], 60) })).status).toBe(409)
    const nota = await api().patch(`/api/admin/turnos/${id}`).set(auth).send({ notas: "avisó por teléfono" })
    expect(nota.body.notas).toBe("avisó por teléfono")
  })

  it("carga un turno que ya pasó (vino sin turno): entra completado y solo se corrige hacia atrás", async () => {
    const r = await api().post("/api/admin/turnos").set(auth).send({ clienteId, servicioId: servicio.id, fecha: "2026-01-05", hora: "06:00" })
    expect(r.status).toBe(201)
    expect(r.body.estado).toBe("completado")
    expect((await api().patch(`/api/admin/turnos/${r.body.id}`).set(auth).send({ fecha: dia })).status).toBe(400)
    // No es de 2030, pero es de una clienta de prueba: lo borra limpiar().
  })
})
