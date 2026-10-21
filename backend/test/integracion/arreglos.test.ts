/** Los arreglos de la revisión del 17/10: login, servicio pausado, recordatorios con seña, cancelado en la página de pago. */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { RowDataPacket } from "mysql2"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, diaAbierto, libres, limpiar, servicioCorto, telefonoEscrito, token } from "./ayuda.js"

let auth: { Authorization: string }

beforeAll(async () => {
  await limpiar()
  auth = { Authorization: `Bearer ${await token()}` }
})
afterAll(cerrar)

describe("arreglos de la revisión", () => {
  it("la base usa la misma hora que Node", async () => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT @@session.time_zone AS tz")
    expect(rows[0].tz).toBe("-03:00")
  })

  it("se puede reprogramar el turno de un servicio que después se pausó", async () => {
    const servicio = await servicioCorto()
    const dia = await diaAbierto(7)
    const c = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", telefono: telefonoEscrito(70) })
    const t = await api().post("/api/admin/turnos").set(auth).send({ clienteId: c.body.id, servicioId: servicio.id, fecha: dia, hora: (await libres(servicio.id, dia))[0] })
    await pool.query("UPDATE servicios SET activo = 0 WHERE id = ?", [servicio.id])
    try {
      // la web ya no lo ofrece…
      expect((await api().get("/api/turnos/disponibilidad").query({ servicioId: servicio.id, fecha: dia })).status).toBe(404)
      // …pero el panel puede mover el turno que ya existía
      const d = await api().get("/api/admin/turnos/disponibilidad").set(auth).query({ servicioId: servicio.id, fecha: dia, excluir: t.body.id })
      expect(d.status).toBe(200)
      const otra = (d.body as { time: string; available: boolean }[]).find((s) => s.available && s.time !== t.body.horaInicio)!
      expect((await api().patch(`/api/admin/turnos/${t.body.id}`).set(auth).send({ hora: otra.time })).status).toBe(200)
    } finally {
      await pool.query("UPDATE servicios SET activo = 1 WHERE id = ?", [servicio.id])
    }
  })

  it("los recordatorios no incluyen turnos con la seña sin pagar", async () => {
    const servicio = await servicioCorto()
    const c = await api().post("/api/admin/clientes").set(auth).send({ nombre: "Test", telefono: telefonoEscrito(71) })
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fecha = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`
    const t = await api().post("/api/admin/turnos").set(auth).send({ clienteId: c.body.id, servicioId: servicio.id, fecha, hora: "06:00", fueraDeHorario: true })
    expect(t.status).toBe(201)
    const aparece = async () =>
      ((await api().get("/api/admin/recordatorios").set(auth)).body.paraMandar as { turno: { id: number } | null }[]).some((a) => a.turno?.id === t.body.id)

    // Sin seña, como cualquier turno de mañana: aparece (si hay algún tipo "antes" de 24 hs o más).
    const conTipos = ((await api().get("/api/admin/recordatorios/tipos").set(auth)).body as { momento: string; horasAntes: number }[]).some(
      (x) => x.momento === "antes" && x.horasAntes >= 30,
    )
    if (conTipos) expect(await aparece()).toBe(true)

    await pool.query("UPDATE turnos SET estado = 'reservado', sena_monto = 1000, sena_estado = 'pendiente', sena_vence_at = NOW() + INTERVAL 30 MINUTE WHERE id = ?", [t.body.id])
    expect(await aparece()).toBe(false)
    await pool.query("UPDATE turnos SET sena_estado = 'pagada' WHERE id = ?", [t.body.id])
    if (conTipos) expect(await aparece()).toBe(true)
  })

  it("la página de pago dice quién canceló el turno", async () => {
    const servicio = await servicioCorto()
    const dia = await diaAbierto(8)
    const r = await api().post("/api/turnos").send({ servicioId: servicio.id, fecha: dia, hora: (await libres(servicio.id, dia))[0], contacto: { nombreCompleto: "Test Pago", telefono: telefonoEscrito(72) } })
    const tk = "d".repeat(32)
    await pool.query("UPDATE turnos SET sena_monto = 1000, sena_estado = 'pendiente', sena_vence_at = NOW() + INTERVAL 30 MINUTE, sena_token = ? WHERE id = ?", [tk, r.body.id])
    await api().post("/api/turnos/mi-turno/cancelar").send({ codigo: String(r.body.id), telefono: telefonoEscrito(72) })
    const s = await api().get(`/api/turnos/sena/${tk}`)
    expect(s.body).toMatchObject({ estado: "cancelado", canceladoPor: "clienta" })
  })

  it("el login corta después de 10 intentos", async () => {
    const codigos: number[] = []
    for (let i = 0; i < 12; i++) {
      codigos.push((await api().post("/api/auth/login").send({ email: "nadie@ejemplo.com", password: "mal" })).status)
    }
    // El primero de este archivo fue el login de beforeAll (token()).
    expect(codigos.slice(0, 9).every((c) => c === 401)).toBe(true)
    expect(codigos.at(-1)).toBe(429)
  })
})
