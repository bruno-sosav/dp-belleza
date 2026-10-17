import { describe, expect, it } from "vitest"
import { armarMensaje, avisoQueToca } from "../src/turnera/recordatorios.js"
import { fechaLarga } from "../src/turnera/tiempo.js"

const confirmacion = { id: 1, horasAntes: 48 }
const recordatorio = { id: 2, horasAntes: 24 }
const tipos = [confirmacion, recordatorio]

describe("avisoQueToca", () => {
  it("no toca nada si el turno está lejos", () => {
    expect(avisoQueToca(72, tipos, [])).toBeNull()
  })

  it("dentro de las 48 hs toca la confirmación", () => {
    expect(avisoQueToca(40, tipos, [])).toBe(confirmacion)
  })

  it("con la confirmación mandada, no vuelve a aparecer hasta que toque el de 24 hs", () => {
    expect(avisoQueToca(40, tipos, [1])).toBeNull()
    expect(avisoQueToca(20, tipos, [1])).toBe(recordatorio)
  })

  it("si reservó a último momento, aparece solo el más cercano", () => {
    expect(avisoQueToca(10, tipos, [])).toBe(recordatorio)
  })

  it("si ya le llegó el de 24 hs, la confirmación no aparece después", () => {
    expect(avisoQueToca(10, tipos, [2])).toBeNull()
  })

  it("con todo mandado, nada", () => {
    expect(avisoQueToca(5, tipos, [1, 2])).toBeNull()
  })

  it("un turno que ya empezó no recibe avisos", () => {
    expect(avisoQueToca(0, tipos, [])).toBeNull()
    expect(avisoQueToca(-3, tipos, [])).toBeNull()
  })

  it("sin tipos configurados, nada", () => {
    expect(avisoQueToca(10, [], [])).toBeNull()
  })
})

describe("armarMensaje", () => {
  const datos = { nombre: "Ana", servicio: "Masaje", fecha: "martes 20 de octubre", hora: "14:30", negocio: "Dp.belleza" }

  it("reemplaza todas las variables, aunque se repitan", () => {
    expect(armarMensaje("Hola {nombre}! Te escribe {negocio}: {servicio} el {fecha} a las {hora}. Chau {nombre}", datos)).toBe(
      "Hola Ana! Te escribe Dp.belleza: Masaje el martes 20 de octubre a las 14:30. Chau Ana",
    )
  })

  it("deja tal cual las llaves que no son variables", () => {
    expect(armarMensaje("{otra} {nombre}", datos)).toBe("{otra} Ana")
  })
})

describe("fechaLarga", () => {
  it("da el día de la semana y el mes en castellano", () => {
    expect(fechaLarga("2026-10-20")).toBe("martes 20 de octubre")
    expect(fechaLarga("2026-11-01")).toBe("domingo 1 de noviembre")
  })
})
