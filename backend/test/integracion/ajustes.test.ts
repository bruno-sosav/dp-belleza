/** Ajustes del negocio y estadísticas (módulo admin). */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { api, cerrar, ponerConfig, token, valorConfig } from "./ayuda.js"

let auth: { Authorization: string }
const originales: Record<string, string | null> = {}
const CLAVES = ["telefono_negocio", "codigo_area_negocio", "intervalo_turnos_min"]

beforeAll(async () => {
  auth = { Authorization: `Bearer ${await token()}` }
  for (const c of CLAVES) originales[c] = await valorConfig(c)
})
afterAll(async () => {
  for (const c of CLAVES) if (originales[c] !== null) await ponerConfig(c, originales[c]!)
  await cerrar()
})

describe("ajustes", () => {
  it("el panel recibe solo las claves conocidas, como texto", async () => {
    const r = await api().get("/api/admin/configuracion").set(auth)
    expect(r.status).toBe(200)
    expect(Object.keys(r.body).sort()).toEqual(
      ["codigo_area_negocio", "cancelacion_horas_minimas", "direccion_negocio", "email_negocio", "intervalo_turnos_min", "nombre_negocio", "reserva_anticipacion_max_dias", "reserva_anticipacion_min_horas", "sena_porcentaje", "telefono_negocio"].sort(),
    )
  })

  it("el WhatsApp del local se normaliza con el código de área que viene en el mismo guardado", async () => {
    const r = await api().patch("/api/admin/configuracion").set(auth).send({ codigo_area_negocio: "0221", telefono_negocio: "15 555-1234" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ codigo_area_negocio: "221", telefono_negocio: "5492215551234" })
  })

  it("rechaza valores que romperían la web", async () => {
    expect((await api().patch("/api/admin/configuracion").set(auth).send({ intervalo_turnos_min: 7 })).status).toBe(400)
    expect((await api().patch("/api/admin/configuracion").set(auth).send({ telefono_negocio: "12" })).status).toBe(400)
  })

  it("la web ve contacto, reglas y seña, y nada más", async () => {
    const r = await api().get("/api/configuracion")
    expect(Object.keys(r.body).sort()).toEqual(
      ["cancelacionHoras", "direccion", "email", "mercadopagoPublicKey", "nombre", "reservaMaxDias", "reservaMinHoras", "senaPorcentaje", "telefono"].sort(),
    )
  })
})

describe("estadísticas", () => {
  it("la serie trae un punto por día, con la forma que esperan los gráficos", async () => {
    const r = await api().get("/api/admin/stats/dias").set(auth).query({ dias: 7 })
    expect(r.body.dias).toHaveLength(7)
    expect(Object.keys(r.body.dias[0]).sort()).toEqual(["bookingCount", "cancelledCount", "date", "noShowCount", "orderCount", "services", "shop", "total", "weekday"])
    expect(r.body.tiendaConectada).toBe(false)
  })

  it("ranking de servicios y detalle de un día", async () => {
    expect((await api().get("/api/admin/stats/servicios").set(auth).query({ dias: 30 })).status).toBe(200)
    expect((await api().get("/api/admin/stats/servicios-del-dia").set(auth).query({ fecha: "2030-01-07" })).body).toEqual([])
    expect((await api().get("/api/admin/stats/servicios-del-dia").set(auth).query({ fecha: "ayer" })).status).toBe(400)
  })
})
