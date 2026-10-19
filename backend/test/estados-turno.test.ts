import { describe, expect, it } from "vitest"
import { puedeCancelar } from "../src/turnera/miTurno.js"
import { ocupaAgenda, puedeCambiarEstadoTurno, requiereHaberEmpezado } from "../src/modules/appointments/domain/estados.js"

describe("puedeCambiarEstadoTurno", () => {
  it("permite el flujo normal", () => {
    expect(puedeCambiarEstadoTurno("reservado", "confirmado")).toBe(true)
    expect(puedeCambiarEstadoTurno("confirmado", "completado")).toBe(true)
    expect(puedeCambiarEstadoTurno("confirmado", "ausente")).toBe(true)
  })

  it("permite completar sin haber confirmado", () => {
    expect(puedeCambiarEstadoTurno("reservado", "completado")).toBe(true)
  })

  it("permite deshacer completado y ausente", () => {
    expect(puedeCambiarEstadoTurno("completado", "confirmado")).toBe(true)
    expect(puedeCambiarEstadoTurno("ausente", "confirmado")).toBe(true)
  })

  it("no permite salir de cancelado ni cancelar algo ya hecho", () => {
    expect(puedeCambiarEstadoTurno("cancelado", "reservado")).toBe(false)
    expect(puedeCambiarEstadoTurno("cancelado", "confirmado")).toBe(false)
    expect(puedeCambiarEstadoTurno("completado", "cancelado")).toBe(false)
    expect(puedeCambiarEstadoTurno("completado", "ausente")).toBe(false)
  })
})

describe("reglas auxiliares", () => {
  it("solo completado y ausente exigen que el turno haya empezado", () => {
    expect(requiereHaberEmpezado("completado")).toBe(true)
    expect(requiereHaberEmpezado("ausente")).toBe(true)
    expect(requiereHaberEmpezado("confirmado")).toBe(false)
    expect(requiereHaberEmpezado("cancelado")).toBe(false)
  })

  it("cancelado y ausente liberan la agenda", () => {
    expect(ocupaAgenda("reservado")).toBe(true)
    expect(ocupaAgenda("completado")).toBe(true)
    expect(ocupaAgenda("cancelado")).toBe(false)
    expect(ocupaAgenda("ausente")).toBe(false)
  })
})

describe("puedeCancelar (Mi turno)", () => {
  it("con más anticipación que el mínimo, sí", () => {
    expect(puedeCancelar("2026-10-20 10:00:00", "2026-10-18 10:00:00", 24)).toBe(true)
  })
  it("justo en el límite, sí", () => {
    expect(puedeCancelar("2026-10-20 10:00:00", "2026-10-19 10:00:00", 24)).toBe(true)
  })
  it("un minuto después del límite, no", () => {
    expect(puedeCancelar("2026-10-20 10:00:00", "2026-10-19 10:01:00", 24)).toBe(false)
  })
  it("con 0 horas, hasta que empieza", () => {
    expect(puedeCancelar("2026-10-20 10:00:00", "2026-10-20 09:59:00", 0)).toBe(true)
    expect(puedeCancelar("2026-10-20 10:00:00", "2026-10-20 10:00:00", 0)).toBe(false)
  })
  it("cruzando de mes", () => {
    expect(puedeCancelar("2026-11-01 09:00:00", "2026-10-30 09:00:00", 48)).toBe(true)
  })
})
