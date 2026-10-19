/** Reglas puras de la clienta (domain/cliente.ts). */
import { describe, expect, it } from "vitest"
import { cumpleValido, datosParaCompletar, fusionarFichas, motivoParaNoEliminar, separarNombreCompleto } from "../../src/modules/customers/domain/cliente.js"
import type { Cliente } from "../../src/modules/customers/domain/cliente.js"

const ana: Cliente = { id: 1, nombre: "Ana", apellido: null, telefono: "5492235551111", email: null, cumple: null, notas: null, clienteDesde: "2026-01-01" }

describe("dominio de clientas", () => {
  it("separa el nombre completo como llega de la web", () => {
    expect(separarNombreCompleto("Ana María Pérez")).toEqual({ nombre: "Ana María", apellido: "Pérez" })
    expect(separarNombreCompleto("  Ana ")).toEqual({ nombre: "Ana", apellido: null })
  })

  it("el 29 de febrero existe; el 31 de abril no", () => {
    expect(cumpleValido({ dia: 29, mes: 2 })).toBe(true)
    expect(cumpleValido({ dia: 31, mes: 4 })).toBe(false)
    expect(cumpleValido({ dia: 1, mes: 13 })).toBe(false)
  })

  it("al volver, nunca se pisa el nombre: solo se completa lo vacío", () => {
    const cambios = datosParaCompletar({ ...ana, apellido: "Pérez" }, { nombre: "Anita", apellido: "Gómez", telefono: ana.telefono, email: "a@b.com" })
    expect(cambios).toEqual({ email: "a@b.com" })
  })

  it("explica por qué no se puede borrar", () => {
    expect(motivoParaNoEliminar("Ana", { turnos: 1, pedidos: 2 })).toMatch(/1 turno y 2 compras/)
    expect(motivoParaNoEliminar("Ana", { turnos: 0, pedidos: 0 })).toBeNull()
  })

  it("al fusionar, gana lo que tiene la que queda y las notas se juntan", () => {
    const otra: Cliente = { ...ana, id: 2, apellido: "Pérez", email: "x@y.com", notas: "B", telefono: "5492235552222" }
    expect(fusionarFichas({ ...ana, notas: "A" }, otra, "esta")).toEqual({
      apellido: "Pérez",
      email: "x@y.com",
      cumple: null,
      notas: "A\n\nB",
      telefono: "5492235551111",
    })
  })
})
