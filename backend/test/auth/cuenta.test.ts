/** Login y "Tu cuenta" con repositorio, contraseñas y sesiones en memoria. */
import { beforeEach, describe, expect, it } from "vitest"
import { CambiarContrasena, EditarCuenta, GuardarAdmin } from "../../src/modules/auth/application/cuenta.usecases.js"
import { IniciarSesion } from "../../src/modules/auth/application/sesion.usecases.js"
import type { Contrasenas, Sesiones, UsuariosRepository } from "../../src/modules/auth/domain/auth.ports.js"
import { cambiaElEmail, problemaDeContrasena, type Usuario } from "../../src/modules/auth/domain/usuario.model.js"

// "Hash" de mentira: alcanza para saber qué clave quedó guardada.
const contrasenas: Contrasenas = { hashear: async (c) => `h:${c}`, coincide: async (c, h) => h === `h:${c}` }
const sesiones: Sesiones = { abrir: (u) => `token-de-${u.nombre}` }

class EnMemoria implements UsuariosRepository {
  filas: Usuario[] = [{ id: 1, nombre: "Daniela", email: "dani@ejemplo.com", rol: "admin", passwordHash: "h:clave-vieja" }]
  async porEmail(email: string) { return this.filas.find((u) => u.email === email) ?? null }
  async porId(id: number) { return this.filas.find((u) => u.id === id) ?? null }
  async actualizarDatos(id: number, d: { nombre: string; email: string }) { Object.assign((await this.porId(id))!, d) }
  async cambiarHash(id: number, hash: string) { (await this.porId(id))!.passwordHash = hash }
  async guardarAdmin(d: { nombre: string; email: string; hash: string }) { this.filas.push({ id: 2, nombre: d.nombre, email: d.email, rol: "admin", passwordHash: d.hash }) }
}

let repo: EnMemoria
beforeEach(() => {
  repo = new EnMemoria()
})

describe("reglas de la cuenta", () => {
  it("contraseña: al menos 8 caracteres y sin espacios en las puntas", () => {
    expect(problemaDeContrasena("corta")).toMatch(/8 caracteres/)
    expect(problemaDeContrasena(" con-espacio")).toMatch(/espacios/)
    expect(problemaDeContrasena("una clave larga")).toBeNull()
  })

  it("cambiar mayúsculas del email no es cambiar el email", () => {
    expect(cambiaElEmail("Dani@Ejemplo.com", "dani@ejemplo.com")).toBe(false)
    expect(cambiaElEmail("dani@ejemplo.com", "otra@ejemplo.com")).toBe(true)
    expect(cambiaElEmail("dani@ejemplo.com", undefined)).toBe(false)
  })
})

describe("iniciar sesión", () => {
  const login = () => new IniciarSesion(repo, contrasenas, sesiones)

  it("el mismo error si el email no existe o si la clave está mal", async () => {
    await expect(login().ejecutar("nadie@ejemplo.com", "x")).rejects.toThrow("Email o contraseña incorrectos")
    await expect(login().ejecutar("dani@ejemplo.com", "x")).rejects.toThrow("Email o contraseña incorrectos")
  })

  it("con la clave correcta devuelve el token y solo id, nombre y rol", async () => {
    const r = await login().ejecutar("dani@ejemplo.com", "clave-vieja")
    expect(r).toEqual({ token: "token-de-Daniela", usuario: { id: 1, nombre: "Daniela", rol: "admin" } })
  })
})

describe("Tu cuenta", () => {
  const editar = () => new EditarCuenta(repo, contrasenas, sesiones)
  const cambiar = () => new CambiarContrasena(repo, contrasenas)

  it("cambiar el nombre no pide la contraseña y devuelve un token con el nombre nuevo", async () => {
    const r = await editar().ejecutar(1, { nombre: "Dani" })
    expect(r.token).toBe("token-de-Dani")
    expect(repo.filas[0].nombre).toBe("Dani")
  })

  it("cambiar el email pide la contraseña actual", async () => {
    await expect(editar().ejecutar(1, { email: "otra@ejemplo.com" })).rejects.toThrow("La contraseña actual no es correcta.")
    await expect(editar().ejecutar(1, { email: "otra@ejemplo.com", contrasenaActual: "mal" })).rejects.toThrow("La contraseña actual")
    expect(repo.filas[0].email).toBe("dani@ejemplo.com")
    await editar().ejecutar(1, { email: "otra@ejemplo.com", contrasenaActual: "clave-vieja" })
    expect(repo.filas[0].email).toBe("otra@ejemplo.com")
  })

  it("la contraseña nueva: pide la actual, distinta de la actual y de 8 caracteres o más", async () => {
    await expect(cambiar().ejecutar(1, "mal", "una clave nueva")).rejects.toThrow("La contraseña actual")
    await expect(cambiar().ejecutar(1, "clave-vieja", "clave-vieja")).rejects.toThrow("distinta")
    await expect(cambiar().ejecutar(1, "clave-vieja", "corta")).rejects.toThrow("8 caracteres")
    await cambiar().ejecutar(1, "clave-vieja", "una clave nueva")
    expect(repo.filas[0].passwordHash).toBe("h:una clave nueva")
  })

  it("crear-admin usa la misma regla de contraseña", async () => {
    await expect(new GuardarAdmin(repo, contrasenas).ejecutar("Ana", "ana@ejemplo.com", "corta")).rejects.toThrow("8 caracteres")
    expect(repo.filas).toHaveLength(1)
  })
})
