/** Todo /api/admin exige sesión: detecta un módulo que monte rutas antes del control. */
import { afterAll, describe, expect, it } from "vitest"
import { api, cerrar } from "./ayuda.js"

afterAll(cerrar)

const rutasDelPanel: [string, string][] = [
  ["get", "/api/admin/turnos"],
  ["post", "/api/admin/turnos"],
  ["get", "/api/admin/turnos/1"],
  ["patch", "/api/admin/turnos/1"],
  ["patch", "/api/admin/turnos/1/estado"],
  ["post", "/api/admin/turnos/1/completar"],
  ["get", "/api/admin/turnos/disponibilidad?servicioId=1&fecha=2030-01-07"],
  ["put", "/api/admin/horarios"],
  ["get", "/api/admin/bloqueos"],
  ["post", "/api/admin/bloqueos"],
  ["delete", "/api/admin/bloqueos/1"],
  ["get", "/api/admin/clientes"],
  ["post", "/api/admin/clientes"],
  ["get", "/api/admin/servicios"],
  ["post", "/api/admin/servicios"],
  ["get", "/api/admin/productos"],
  ["put", "/api/admin/productos/1/stock"],
  ["post", "/api/admin/productos/1/reponer"],
  ["get", "/api/admin/categorias"],
  ["get", "/api/admin/pedidos"],
  ["get", "/api/admin/caja"],
  ["post", "/api/admin/cobros"],
  ["delete", "/api/admin/cobros/1"],
  ["get", "/api/admin/recordatorios"],
  ["get", "/api/admin/configuracion"],
  ["patch", "/api/admin/configuracion"],
  ["get", "/api/admin/mercadopago"],
  ["put", "/api/admin/mercadopago"],
  ["post", "/api/admin/mercadopago/probar"],
  ["delete", "/api/admin/mercadopago"],
  ["get", "/api/admin/cuenta"],
  ["patch", "/api/admin/cuenta"],
  ["post", "/api/admin/cuenta/contrasena"],
  ["get", "/api/auth/yo"],
  ["get", "/api/admin/stats/dias"],
  ["get", "/api/admin/stats/servicios"],
  ["get", "/api/admin/stats/servicios-del-dia?fecha=2030-01-07"],
]

describe("el aviso de Mercado Pago", () => {
  it("lo que no es un pago se contesta 200 sin hacer nada (para que no reintente)", async () => {
    const r = await api().post("/api/mercadopago/webhook").send({ type: "merchant_order", data: { id: "1" } })
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ ignorado: true })
  })

  it("un id que no es un número se ignora", async () => {
    expect((await api().post("/api/mercadopago/webhook").send({ type: "payment", data: { id: "1; DROP" } })).body).toEqual({ ignorado: true })
  })
})

describe("el panel exige sesión", () => {
  it.each(rutasDelPanel)("%s %s sin sesión → 401", async (metodo, ruta) => {
    const r = await (api() as unknown as Record<string, (url: string) => Promise<{ status: number }>>)[metodo](ruta)
    expect(r.status).toBe(401)
  })
})
