import { describe, expect, it } from "vitest"
import { normalizarTelefono } from "../src/modules/customers/domain/telefono.js"

describe("normalizarTelefono", () => {
  it.each([
    // Como lo escribe la clienta casi siempre: código de área + número
    ["2235551234", "5492235551234"],
    ["223 555-1234", "5492235551234"],
    ["223-5551234", "5492235551234"],
    ["(0223) 4951234", "5492234951234"],
    // Con 0 y 15 de más
    ["0223 15-123-4567", "5492231234567"],
    ["223 15 1234567", "5492231234567"],
    ["11 15 1234-5678", "5491112345678"],
    ["011 1234-5678", "5491112345678"],
    ["2966 15 123456", "5492966123456"],
    // Con código de país
    ["+54 9 223 123-4567", "5492231234567"],
    ["+54 223 555 1234", "5492235551234"],
    ["54 11 1234 5678", "5491112345678"],
    ["0054 9 351 555 1234", "5493515551234"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada, "223")).toBe(esperado)
  })

  it.each([
    ["15 555-1234", "5492235551234"],
    ["155551234", "5492235551234"],
    ["4951234", "5492234951234"],
    ["495-1234", "5492234951234"],
  ])("sin código de área usa el del local: %s -> %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada, "223")).toBe(esperado)
  })

  it("sin código de área y sin saber el del local, no adivina", () => {
    expect(normalizarTelefono("4951234")).toBeNull()
  })

  it("con el código de área de otra ciudad (4 dígitos)", () => {
    expect(normalizarTelefono("15 123456", "2966")).toBe("5492966123456")
  })

  it("un número de otro país solo si viene con +", () => {
    expect(normalizarTelefono("+1 415 555 0100", "223")).toBe("14155550100")
    expect(normalizarTelefono("+598 99 123 456", "223")).toBe("59899123456")
  })

  it("rechaza un número argentino con dígitos de más o de menos (antes se guardaba como extranjero)", () => {
    expect(normalizarTelefono("22355512345", "223")).toBeNull()
    expect(normalizarTelefono("223555123", "223")).toBeNull()
  })

  it("rechaza números demasiado cortos o sin dígitos", () => {
    expect(normalizarTelefono("12345", "223")).toBeNull()
    expect(normalizarTelefono("abc", "223")).toBeNull()
  })
})
