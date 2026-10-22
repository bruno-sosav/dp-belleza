import { describe, expect, it } from "vitest"
import { cumpleQueToca, horasEntre, problemaDeRegistro } from "../../src/modules/reminders/models/recordatorio.model.js"

describe("recordatorios: reglas", () => {
  it("cumpleaños: el tipo más cercano que aplica y no se hizo", () => {
    const tipos = [{ id: 1, dias: 7 }, { id: 2, dias: 0 }, { id: 3, dias: 2 }]
    expect(cumpleQueToca(1, tipos, [])?.id).toBe(3)
    expect(cumpleQueToca(1, tipos, [3])?.id).toBe(1)
    expect(cumpleQueToca(0, tipos, [])?.id).toBe(2)
    expect(cumpleQueToca(10, tipos, [])).toBeNull()
  })

  it("un aviso hecho se identifica por turno, o por clienta y año (no las dos cosas)", () => {
    expect(problemaDeRegistro({ tipoId: 1, turnoId: 5 })).toBeNull()
    expect(problemaDeRegistro({ tipoId: 1, clienteId: 4, anio: 2026 })).toBeNull()
    expect(problemaDeRegistro({ tipoId: 1 })).not.toBeNull()
    expect(problemaDeRegistro({ tipoId: 1, clienteId: 4 })).not.toBeNull()
    expect(problemaDeRegistro({ tipoId: 1, turnoId: 5, clienteId: 4, anio: 2026 })).not.toBeNull()
  })

  it("horas entre dos momentos, cruzando días", () => {
    expect(horasEntre("2030-01-10 22:00:00", "2030-01-11 10:30:00")).toBe(12.5)
  })
})
