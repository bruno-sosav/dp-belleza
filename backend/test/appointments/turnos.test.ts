import { describe, expect, it } from "vitest"
import { montoSena, resultadoDelPago, type PagoDeSena } from "../../src/modules/appointments/models/sena.model.js"
import { codigoDeTurno, idDesdeCodigo, problemaAlDar, problemaAlMover, yaEmpezo } from "../../src/modules/appointments/models/turno.model.js"

const ahora = { fecha: "2030-01-10", minutos: 12 * 60 }

describe("turno", () => {
  it("código de la clienta ida y vuelta", () => {
    expect(codigoDeTurno(123)).toBe("DP-000123")
    expect(idDesdeCodigo("dp 123")).toBe(123)
    expect(idDesdeCodigo("DP-000123")).toBe(123)
    expect(idDesdeCodigo("abc")).toBeNull()
  })

  it("ya empezó: antes de hoy, o hoy a esta hora o antes", () => {
    expect(yaEmpezo("2030-01-09", 23 * 60, ahora)).toBe(true)
    expect(yaEmpezo("2030-01-10", 12 * 60, ahora)).toBe(true)
    expect(yaEmpezo("2030-01-10", 12 * 60 + 1, ahora)).toBe(false)
  })

  it("dar: solo un completado puede estar en el pasado, y nada pasa la medianoche", () => {
    expect(problemaAlDar("confirmado", true, 600, 60)).toMatch(/ya pasó/)
    expect(problemaAlDar("completado", false, 600, 60)).toMatch(/Todavía no/)
    expect(problemaAlDar("confirmado", false, 24 * 60 + 30, 60)).toMatch(/medianoche/)
    expect(problemaAlDar("completado", true, 600, 60)).toBeNull()
  })

  it("mover: cancelado no; pedido para adelante; completado o no vino, al pasado", () => {
    expect(problemaAlMover("cancelado", false)?.tipo).toBe("conflicto")
    expect(problemaAlMover("confirmado", true)?.tipo).toBe("invalido")
    expect(problemaAlMover("completado", false)?.tipo).toBe("invalido")
    expect(problemaAlMover("ausente", false)?.mensaje).toMatch(/no vino/)
    expect(problemaAlMover("reservado", false)).toBeNull()
    expect(problemaAlMover("completado", true)).toBeNull()
  })
})

describe("seña", () => {
  const sena = { monto: montoSena(10_000, 30), estado: "pendiente" as const, token: "x" }
  const pago = (monto: number, aprobado = true): PagoDeSena => ({ id: 1, aprobado, monto, referencia: "turno-1" })

  it("monto en pesos enteros, nunca más que el precio", () => {
    expect(sena.monto).toBe(3000)
    expect(montoSena(10_000, 150)).toBe(10_000)
    expect(montoSena(10_000, 0)).toBe(0)
  })

  it("pago aprobado de un turno esperando: queda confirmado", () => {
    expect(resultadoDelPago({ estado: "reservado", canceladoPor: null, sena }, pago(3000), false)).toEqual({ aplicar: true, estado: "confirmado", canceladoPor: null })
  })

  it("rechazado, de menos o ya pagada: no se aplica", () => {
    const t = { estado: "reservado" as const, canceladoPor: null, sena }
    expect(resultadoDelPago(t, pago(3000, false), false).aplicar).toBe(false)
    expect(resultadoDelPago(t, pago(2000), false).aplicar).toBe(false)
    expect(resultadoDelPago({ ...t, sena: { ...sena, estado: "pagada" } }, pago(3000), false).aplicar).toBe(false)
  })

  it("pago tarde: recupera el turno si el horario sigue libre; si no, sigue cancelado con la seña pagada", () => {
    const vencido = { estado: "cancelado" as const, canceladoPor: "sistema" as const, sena: { ...sena, estado: "vencida" as const } }
    expect(resultadoDelPago(vencido, pago(3000), true)).toEqual({ aplicar: true, estado: "confirmado", canceladoPor: null })
    expect(resultadoDelPago(vencido, pago(3000), false)).toEqual({ aplicar: true, estado: "cancelado", canceladoPor: "sistema" })
  })
})
