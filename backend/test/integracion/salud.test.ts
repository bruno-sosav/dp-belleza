/** /api/salud y los errores que no son culpa del servidor. */
import { afterAll, describe, expect, it, vi } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar } from "./ayuda.js"

afterAll(cerrar)

describe("/api/salud", () => {
  it("con la base andando: 200", async () => {
    const r = await api().get("/api/salud")
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ ok: true, base: "ok" })
  })

  it("si MySQL no contesta: 503, para que el hosting se entere", async () => {
    const espia = vi.spyOn(pool, "query").mockRejectedValueOnce(new Error("connect ECONNREFUSED"))
    const r = await api().get("/api/salud")
    espia.mockRestore()
    expect(r.status).toBe(503)
    expect(r.body).toEqual({ ok: false, base: "sin conexión" })
  })
})

describe("pedidos mal armados", () => {
  it("un body de más de 100 kB: 413, no 500", async () => {
    const r = await api().post("/api/auth/login").send({ email: "a".repeat(200_000), password: "x" })
    expect(r.status).toBe(413)
    expect(r.body.error).toBe("El pedido es demasiado grande")
  })

  it("JSON roto: 400", async () => {
    const r = await api().post("/api/auth/login").set("Content-Type", "application/json").send('{"email":')
    expect(r.status).toBe(400)
  })
})
