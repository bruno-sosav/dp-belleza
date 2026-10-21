import { describe, expect, it } from "vitest"
import { conflicto, ErrorDeNegocio, externo, HttpError, invalido, noAutorizado, noEncontrado } from "../src/core/negocio.error.js"
import { manejarErrores } from "../src/core/http/manejarErrores.middleware.js"

/** Llama al manejador de errores con una respuesta falsa y devuelve qué contestó. */
function responder(err: unknown) {
  const salida: { status?: number; cuerpo?: unknown } = {}
  const res = {
    status(s: number) {
      salida.status = s
      return this
    },
    json(c: unknown) {
      salida.cuerpo = c
    },
  }
  manejarErrores(err, {} as never, res as never, () => {})
  return salida
}

describe("errores de negocio → HTTP", () => {
  it.each([
    [invalido("x"), 400],
    [noAutorizado("x"), 401],
    [noEncontrado("Turno"), 404],
    [conflicto("x"), 409],
    [externo("x"), 502],
  ])("%s → %i", (err, status) => {
    expect(responder(err).status).toBe(status)
  })

  it("el dominio no conoce códigos HTTP: un error de negocio no tiene `status`", () => {
    expect("status" in conflicto("x")).toBe(false)
    expect(conflicto("x")).toBeInstanceOf(ErrorDeNegocio)
  })

  it("la forma vieja (HttpError) sigue funcionando mientras se mudan los módulos", () => {
    expect(responder(new HttpError(409, "ocupado"))).toEqual({ status: 409, cuerpo: { error: "ocupado" } })
  })

  it("un error desconocido es un 500 sin detalles internos", () => {
    const original = console.error
    console.error = () => {}
    try {
      expect(responder(new Error("se rompió la base"))).toEqual({ status: 500, cuerpo: { error: "Error interno del servidor" } })
    } finally {
      console.error = original
    }
  })
})
