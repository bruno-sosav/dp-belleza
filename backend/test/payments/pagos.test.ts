import { describe, expect, it } from "vitest"
import { problemaDeCobroManual, sePuedeBorrar, totalesPorMedio } from "../../src/modules/payments/domain/cobro.js"
import { destinoDelPago, modoDeLaCuenta, problemaDeCredenciales } from "../../src/modules/payments/domain/mercadoPago.js"

describe("cobros", () => {
  it("uno de seña o de turno dice de qué turno es; 'otro' dice qué fue", () => {
    expect(problemaDeCobroManual({ concepto: "turno" })).toMatch(/de qué turno/)
    expect(problemaDeCobroManual({ concepto: "sena" })).toMatch(/de qué turno/)
    expect(problemaDeCobroManual({ concepto: "otro" })).toMatch(/qué es este cobro/)
    expect(problemaDeCobroManual({ concepto: "turno", turnoId: 4 })).toBeNull()
    expect(problemaDeCobroManual({ concepto: "otro", descripcion: "gift card" })).toBeNull()
  })

  it("los de Mercado Pago no se borran desde el panel", () => {
    expect(sePuedeBorrar({ mpPagoId: 123 })).toBe(false)
    expect(sePuedeBorrar({ mpPagoId: null })).toBe(true)
  })

  it("totales por medio de pago, con todos los medios aunque estén en cero", () => {
    const t = totalesPorMedio([
      { medio: "efectivo", monto: 1000 },
      { medio: "efectivo", monto: 500 },
      { medio: "mercadopago", monto: 3000 },
    ])
    expect(t.porMedio).toEqual({ efectivo: 1500, debito: 0, credito: 0, transferencia: 0, mercadopago: 3000 })
    expect(t.total).toBe(4500)
  })
})

describe("Mercado Pago", () => {
  it("credenciales: las dos de prueba o las dos de producción", () => {
    expect(problemaDeCredenciales("TEST-abc", "APP_USR-abc")).toMatch(/los dos/)
    expect(problemaDeCredenciales("TEST-abc", "TEST-abc")).toBeNull()
    expect(problemaDeCredenciales("APP_USR-abc", "APP_USR-abc")).toBeNull()
  })

  it("modo: prueba si el token es TEST- o el usuario es de prueba", () => {
    expect(modoDeLaCuenta("TEST-abc", "LOCAL")).toBe("prueba")
    expect(modoDeLaCuenta("APP_USR-abc", "TESTUSER123")).toBe("prueba")
    expect(modoDeLaCuenta("APP_USR-abc", "DPBELLEZA")).toBe("produccion")
  })

  it("a quién le toca un pago, por su referencia", () => {
    expect(destinoDelPago("turno-12")).toEqual({ tipo: "turno", id: 12 })
    expect(destinoDelPago("pedido-15")).toEqual({ tipo: "pedido", id: 15 })
    expect(destinoDelPago("otra cosa")).toBeNull()
    expect(destinoDelPago(null)).toBeNull()
  })
})
