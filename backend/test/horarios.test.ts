import { describe, expect, it } from "vitest"
import { entraEnHorario, problemaEnFranjas } from "../src/turnera/horarios.js"
import { problemaDeAnticipacion } from "../src/turnera/reglasReserva.js"

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

describe("problemaDeAnticipacion (reglas de la web)", () => {
  const reglas = { minHoras: 2, maxDias: 60 }
  const ahora = { fecha: "2026-10-19", minutos: 10 * 60 } // lunes 10:00

  it("con más de 2 horas de anticipación, se puede", () => {
    expect(problemaDeAnticipacion("2026-10-19", 12 * 60, ahora, reglas)).toBeNull()
  })
  it("con menos, no", () => {
    expect(problemaDeAnticipacion("2026-10-19", 11 * 60 + 59, ahora, reglas)).toMatch(/2 horas/)
  })
  it("la anticipación cruza la medianoche", () => {
    const tarde = { fecha: "2026-10-19", minutos: 23 * 60 }
    expect(problemaDeAnticipacion("2026-10-20", 30, tarde, reglas)).toMatch(/2 horas/)
    expect(problemaDeAnticipacion("2026-10-20", 60, tarde, reglas)).toBeNull()
  })
  it("hasta 60 días sí; el 61 no", () => {
    expect(problemaDeAnticipacion("2026-12-18", 10 * 60, ahora, reglas)).toBeNull()
    expect(problemaDeAnticipacion("2026-12-19", 10 * 60, ahora, reglas)).toMatch(/60 días/)
  })
  it("con 0 horas, cualquier horario que no pasó", () => {
    expect(problemaDeAnticipacion("2026-10-19", 10 * 60 + 1, ahora, { minHoras: 0, maxDias: 60 })).toBeNull()
  })
})
