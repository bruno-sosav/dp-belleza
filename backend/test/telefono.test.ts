import { describe, expect, it } from "vitest"
import { normalizarTelefono } from "../src/shared/models/telefono.js"

describe("normalizarTelefono", () => {
  it.each([
    ["+54 9 223 123-4567", "5492231234567"],
    ["2231234567", "5492231234567"],
    ["0223 15-123-4567", "5492231234567"],
    ["223 15 1234567", "5492231234567"],
    ["11 15 1234-5678", "5491112345678"],
    ["011 1234-5678", "5491112345678"],
    ["54 11 1234 5678", "5491112345678"],
    ["2966 15 123456", "5492966123456"],
    ["0054 9 351 555 1234", "5493515551234"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado)
  })

  it("rechaza números demasiado cortos", () => {
    expect(normalizarTelefono("12345")).toBeNull()
    expect(normalizarTelefono("abc")).toBeNull()
  })
})
