/** Envíos: reglas puras, el simulador del modo prueba y los casos de uso con puertos en memoria. */
import { describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/negocio.error.js"
import { armarBulto, conEnvioGratis, normalizarCP, sePuedeDespachar, tarifaDePrueba } from "../../src/modules/shipping/models/envio.model.js"
import { TransportistaDePrueba } from "../../src/modules/shipping/integrations/prueba.transportista.js"
import { CotizarEnvio, ElegirTransportista } from "../../src/modules/shipping/services/envios.usecases.js"
import type { AjustesDeEnvio, CuentaAndreaniRepository, FuenteDeAjustes } from "../../src/modules/shipping/models/envios.ports.js"

describe("reglas de envío", () => {
  it("normaliza el código postal: 4 números o el CPA nuevo", () => {
    expect(normalizarCP("7600")).toBe("7600")
    expect(normalizarCP(" b7600fda ")).toBe("7600")
    expect(normalizarCP("760")).toBeNull()
    expect(normalizarCP("0000")).toBeNull()
    expect(normalizarCP("ABCD")).toBeNull()
  })

  it("arma un bulto con el peso de las unidades", () => {
    expect(armarBulto(3, 300, 25000)).toEqual({ kilos: 0.9, volumenCm3: 3000, valorDeclarado: 25000 })
    expect(armarBulto(1, 10, 100).kilos).toBe(0.1)
  })

  it("el envío es gratis desde el monto configurado (0 = nunca)", () => {
    const tarifa = { costo: 5432.6, plazoDias: 3 }
    expect(conEnvioGratis(tarifa, 30000, 30000, "prueba")).toEqual({ costo: 0, plazoDias: 3, gratis: true, proveedor: "prueba" })
    expect(conEnvioGratis(tarifa, 29999, 30000, "prueba").costo).toBe(5433)
    expect(conEnvioGratis(tarifa, 999999, 0, "prueba").gratis).toBe(false)
  })

  it("la tarifa de prueba es más cara lejos y con más peso", () => {
    const cerca = tarifaDePrueba("7600", "7603", 1)
    const lejos = tarifaDePrueba("7600", "9410", 1)
    expect(lejos.costo).toBeGreaterThan(cerca.costo)
    expect(tarifaDePrueba("7600", "9410", 5).costo).toBeGreaterThan(lejos.costo)
    expect(lejos.plazoDias).toBeGreaterThan(cerca.plazoDias)
  })

  it("solo se despacha un pedido confirmado que todavía no salió", () => {
    expect(sePuedeDespachar("confirmado", { estado: "a_despachar" })).toBe(true)
    expect(sePuedeDespachar("pendiente", { estado: "a_despachar" })).toBe(false)
    expect(sePuedeDespachar("confirmado", { estado: "despachado" })).toBe(false)
  })
})

describe("transportista de prueba", () => {
  it("inventa un número de envío y un seguimiento según las horas que pasaron", async () => {
    const ahora = new Date("2030-01-10T12:00:00")
    const t = new TransportistaDePrueba(() => ahora)
    expect((await t.despachar("7600", { pedidoId: 15 } as never)).numero).toMatch(/^PRUEBA-000015-[0-9A-F]{4}$/)
    expect((await t.seguimiento("X", "2030-01-10 11:00")).map((e) => e.estado)).toEqual(["Envío creado"])
    expect((await t.seguimiento("X", "2030-01-07 12:00")).at(-1)?.estado).toBe("En distribución")
    expect(await t.seguimiento("X", null)).toEqual([])
  })
})

describe("cotizar", () => {
  const sinCuenta = { leer: async () => null } as unknown as CuentaAndreaniRepository
  const con = (a: Partial<AjustesDeEnvio>) => {
    const ajustes: FuenteDeAjustes = { leer: async () => ({ modo: "prueba", gratisDesde: 0, cpOrigen: "7600", pesoUnidadG: 300, ...a }), remitente: async () => ({ nombre: "", direccion: "", email: "", telefono: "" }) }
    const prueba = new TransportistaDePrueba()
    return new CotizarEnvio(new ElegirTransportista(ajustes, prueba, prueba, sinCuenta))
  }
  const tipo = (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof ErrorDeNegocio ? e.tipo : "otro"))

  it("en modo prueba cotiza con el simulador", async () => {
    const c = await con({}).ejecutar({ codigoPostal: "7603", unidades: 2, subtotal: 10000 })
    expect(c).toMatchObject({ gratis: false, proveedor: "prueba" })
    expect(c.costo).toBeGreaterThan(0)
  })

  it("con envíos desactivados, o Andreani sin cuenta, no se puede", async () => {
    expect(await tipo(con({ modo: "desactivado" }).ejecutar({ codigoPostal: "7603", unidades: 1, subtotal: 1 }))).toBe("conflicto")
    expect(await tipo(con({ modo: "andreani" }).ejecutar({ codigoPostal: "7603", unidades: 1, subtotal: 1 }))).toBe("conflicto")
  })

  it("un código postal inválido es un error de datos", async () => {
    expect(await tipo(con({}).ejecutar({ codigoPostal: "12", unidades: 1, subtotal: 1 }))).toBe("invalido")
  })
})
