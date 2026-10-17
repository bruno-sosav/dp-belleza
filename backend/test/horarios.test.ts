import { describe, expect, it } from "vitest"
import { entraEnHorario, problemaEnFranjas } from "../src/turnera/horarios.js"

describe("problemaEnFranjas", () => {
  it("acepta un horario normal, con un día cortado al mediodía", () => {
    expect(
      problemaEnFranjas([
        { diaSemana: 1, desde: "09:00", hasta: "13:00" },
        { diaSemana: 1, desde: "15:00", hasta: "19:00" },
        { diaSemana: 6, desde: "10:00", hasta: "15:00" },
      ]),
    ).toBeNull()
  })

  it("acepta la semana entera cerrada (sin franjas)", () => {
    expect(problemaEnFranjas([])).toBeNull()
  })

  it("rechaza un cierre antes de la apertura", () => {
    expect(problemaEnFranjas([{ diaSemana: 2, desde: "18:00", hasta: "09:00" }])).toMatch(/martes/)
  })

  it("rechaza dos franjas del mismo día que se pisan", () => {
    expect(
      problemaEnFranjas([
        { diaSemana: 3, desde: "09:00", hasta: "14:00" },
        { diaSemana: 3, desde: "13:00", hasta: "19:00" },
      ]),
    ).toMatch(/miércoles.*se pisan/)
  })

  it("deja que una franja empiece justo cuando termina la otra", () => {
    expect(
      problemaEnFranjas([
        { diaSemana: 4, desde: "09:00", hasta: "13:00" },
        { diaSemana: 4, desde: "13:00", hasta: "19:00" },
      ]),
    ).toBeNull()
  })
})

describe("entraEnHorario", () => {
  const franjas = [
    { diaSemana: 1, desde: "09:00", hasta: "13:00" },
    { diaSemana: 1, desde: "15:00", hasta: "19:00" },
  ]

  it("entra si cabe completo en una franja", () => {
    expect(entraEnHorario(1, "09:00", "10:00", franjas)).toBe(true)
    expect(entraEnHorario(1, "18:00", "19:00", franjas)).toBe(true)
  })

  it("no entra si cruza el corte del mediodía", () => {
    expect(entraEnHorario(1, "12:30", "13:30", franjas)).toBe(false)
  })

  it("no entra en un día cerrado", () => {
    expect(entraEnHorario(7, "10:00", "11:00", franjas)).toBe(false)
  })
})
