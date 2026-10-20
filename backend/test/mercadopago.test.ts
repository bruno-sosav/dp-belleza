import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { cifrar, descifrar } from "../src/core/seguridad/cifrado.js"
import { firmaValida } from "../src/modules/payments/domain/mercadoPago.js"
import { montoSena } from "../src/modules/appointments/domain/sena.js"

describe("cifrado de credenciales", () => {
  it("lo cifrado se descifra igual", () => {
    const token = "APP_USR-1234567890123456-101716-abcdef0123456789abcdef0123456789-123456789"
    expect(descifrar(cifrar(token))).toBe(token)
  })

  it("no guarda el texto a la vista y cada vez sale distinto", () => {
    const a = cifrar("secreto")
    expect(a).not.toContain("secreto")
    expect(cifrar("secreto")).not.toBe(a)
  })

  it("si alguien modifica lo guardado, falla en vez de devolver basura", () => {
    const [v, iv, tag, dato] = cifrar("secreto").split(":")
    const tocado = Buffer.from(dato, "base64")
    tocado[0] ^= 1
    expect(() => descifrar([v, iv, tag, tocado.toString("base64")].join(":"))).toThrow()
  })
})

describe("firma del webhook", () => {
  const secreto = "clave-secreta-del-webhook"
  const firmar = (manifiesto: string) => createHmac("sha256", secreto).update(manifiesto).digest("hex")

  it("acepta una notificación firmada como lo hace Mercado Pago", () => {
    const v1 = firmar("id:123456;request-id:abc-1;ts:1700000000;")
    expect(firmaValida(secreto, `ts=1700000000,v1=${v1}`, "abc-1", "123456")).toBe(true)
  })

  it("rechaza si cambia el id del pago, falta la firma o la clave es otra", () => {
    const v1 = firmar("id:123456;request-id:abc-1;ts:1700000000;")
    expect(firmaValida(secreto, `ts=1700000000,v1=${v1}`, "abc-1", "999999")).toBe(false)
    expect(firmaValida(secreto, undefined, "abc-1", "123456")).toBe(false)
    expect(firmaValida("otra-clave", `ts=1700000000,v1=${v1}`, "abc-1", "123456")).toBe(false)
  })
})

describe("montoSena", () => {
  it("es el porcentaje del precio, en pesos enteros", () => {
    expect(montoSena(24000, 30)).toBe(7200)
    expect(montoSena(19999, 5)).toBe(1000)
  })
  it("con 0 % no hay seña; con 100 % es el precio entero; nunca más", () => {
    expect(montoSena(24000, 0)).toBe(0)
    expect(montoSena(24000, 100)).toBe(24000)
    expect(montoSena(24000, 150)).toBe(24000)
  })
})
