/** Login y Tu cuenta con una usuaria de prueba que se crea y se borra. */
import bcrypt from "bcryptjs"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar } from "./ayuda.js"

const EMAIL = "cuenta-de-prueba@ejemplo.test"
const OTRO_EMAIL = "cuenta-de-prueba-2@ejemplo.test"
const CLAVE = "clave de prueba"
let sesion: { Authorization: string }

const borrar = () => pool.query("DELETE FROM usuarios WHERE email IN (?, ?)", [EMAIL, OTRO_EMAIL])

beforeAll(async () => {
  await borrar()
  await pool.query("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('Prueba', ?, ?, 'admin')", [EMAIL, await bcrypt.hash(CLAVE, 4)])
})
afterAll(async () => {
  await borrar()
  await cerrar()
})

describe("login", () => {
  it("con la clave mal: 401 y el mismo mensaje que con un email que no existe", async () => {
    const mal = await api().post("/api/auth/login").send({ email: EMAIL, password: "otra cosa" })
    const nadie = await api().post("/api/auth/login").send({ email: "nadie@ejemplo.test", password: "otra cosa" })
    expect(mal.status).toBe(401)
    expect(mal.body).toEqual(nadie.body)
  })

  it("con la clave bien: token y solo id, nombre y rol", async () => {
    const r = await api().post("/api/auth/login").send({ email: EMAIL, password: CLAVE })
    expect(r.status).toBe(200)
    expect(Object.keys(r.body.usuario).sort()).toEqual(["id", "nombre", "rol"])
    sesion = { Authorization: `Bearer ${r.body.token}` }
    expect((await api().get("/api/auth/yo").set(sesion)).body).toEqual(r.body.usuario)
  })
})

describe("Tu cuenta", () => {
  it("devuelve solo nombre y email", async () => {
    expect((await api().get("/api/admin/cuenta").set(sesion)).body).toEqual({ nombre: "Prueba", email: EMAIL })
  })

  it("cambiar el email sin la contraseña actual no se puede", async () => {
    const r = await api().patch("/api/admin/cuenta").set(sesion).send({ email: OTRO_EMAIL })
    expect(r.status).toBe(400)
  })

  it("un email que ya usa otra cuenta → 409", async () => {
    await pool.query("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('Otra', ?, 'x', 'admin')", [OTRO_EMAIL])
    const r = await api().patch("/api/admin/cuenta").set(sesion).send({ email: OTRO_EMAIL, contrasenaActual: CLAVE })
    expect(r.status).toBe(409)
    await pool.query("DELETE FROM usuarios WHERE email = ?", [OTRO_EMAIL])
  })

  it("cambiar el nombre devuelve un token nuevo con el nombre nuevo", async () => {
    const r = await api().patch("/api/admin/cuenta").set(sesion).send({ nombre: "Prueba 2" })
    expect(r.status).toBe(200)
    expect(r.body.usuario.nombre).toBe("Prueba 2")
    expect((await api().get("/api/auth/yo").set({ Authorization: `Bearer ${r.body.token}` })).body.nombre).toBe("Prueba 2")
  })

  it("cambiar la contraseña: con la actual mal no; con la actual bien sí, y se entra con la nueva", async () => {
    expect((await api().post("/api/admin/cuenta/contrasena").set(sesion).send({ actual: "mal", nueva: "otra clave larga" })).status).toBe(400)
    const corta = await api().post("/api/admin/cuenta/contrasena").set(sesion).send({ actual: CLAVE, nueva: "corta" })
    expect(corta.status).toBe(400)
    expect(corta.body.detalle[0].mensaje).toMatch(/8 caracteres/)
    expect((await api().post("/api/admin/cuenta/contrasena").set(sesion).send({ actual: CLAVE, nueva: "otra clave larga" })).status).toBe(204)
    expect((await api().post("/api/auth/login").send({ email: EMAIL, password: "otra clave larga" })).status).toBe(200)
  })
})
