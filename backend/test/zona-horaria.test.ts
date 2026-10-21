import { describe, expect, it } from "vitest"
import { desfasajeMySQL } from "../src/core/database/conexion.database.js"

describe("zona horaria", () => {
  it("el backend usa la hora de Argentina aunque el servidor esté en otra zona", () => {
    expect(process.env.TZ).toBe("America/Argentina/Buenos_Aires")
    expect(desfasajeMySQL(new Date("2026-10-17T15:00:00Z"))).toBe("-03:00")
  })
})
