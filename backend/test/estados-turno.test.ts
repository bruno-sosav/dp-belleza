import { describe, expect, it } from "vitest"
import { ocupaAgenda, puedeCambiarEstadoTurno, requiereHaberEmpezado } from "../src/turnera/estados.js"

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
