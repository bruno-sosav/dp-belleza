/**
 * Todo lo del panel (/api/admin) exige sesión. Con la reorganización por
 * módulos, cada uno monta sus rutas: si alguno quedara antes del control de
 * sesión, este test lo detecta.
 */
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
  ["get", "/api/admin/recordatorios"],
  ["get", "/api/admin/configuracion"],
  ["get", "/api/admin/mercadopago"],
  ["get", "/api/admin/cuenta"],
  ["get", "/api/admin/stats/dias"],
]

describe("el panel exige sesión", () => {
  it.each(rutasDelPanel)("%s %s sin sesión → 401", async (metodo, ruta) => {
    const r = await (api() as unknown as Record<string, (url: string) => Promise<{ status: number }>>)[metodo](ruta)
    expect(r.status).toBe(401)
  })
})
