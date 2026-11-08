/** Dos clientas que reservan el mismo horario en el mismo instante: entra una sola. */
import type { RowDataPacket } from "mysql2"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pool } from "../../src/core/database/conexion.database.js"
import { api, cerrar, diaAbierto, libres, limpiar, masMinutos, servicioCorto, telefonoEscrito } from "./ayuda.js"

let servicio: Awaited<ReturnType<typeof servicioCorto>>

beforeAll(async () => {
  await limpiar()
  servicio = await servicioCorto()
})
afterAll(cerrar)

const reservar = (fecha: string, hora: string, n: number) =>
  api()
    .post("/api/turnos")
    .send({ servicioId: servicio.id, fecha, hora, contacto: { nombreCompleto: `Test Simultanea ${n}`, telefono: telefonoEscrito(80 + n) } })

const turnosA = async (fecha: string, hora: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM turnos WHERE fecha_hora_inicio = ? AND estado <> 'cancelado'",
    [`${fecha} ${hora}:00`],
  )
  return Number(rows[0].n)
}

describe("reservas simultáneas", () => {
  it("dos al mismo horario: una 201, la otra 409, y queda un solo turno", async () => {
    const dia = await diaAbierto(12)
    const [hora] = await libres(servicio.id, dia)
    const respuestas = await Promise.all([reservar(dia, hora, 1), reservar(dia, hora, 2)])
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409])
    expect(await turnosA(dia, hora)).toBe(1)
  })

  it("cinco a la vez al mismo horario: ninguna da 500 y entra una sola", async () => {
    const dia = await diaAbierto(13)
    const [hora] = await libres(servicio.id, dia)
    const respuestas = await Promise.all([1, 2, 3, 4, 5].map((n) => reservar(dia, hora, n)))
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409])
    expect(await turnosA(dia, hora)).toBe(1)
  })

  it("dos a la vez en horarios que no se pisan: entran las dos", async () => {
    const dia = await diaAbierto(14)
    const [primera, ...resto] = await libres(servicio.id, dia)
    const segunda = resto.find((h) => h >= masMinutos(primera, servicio.durationMin))!
    const respuestas = await Promise.all([reservar(dia, primera, 6), reservar(dia, segunda, 7)])
    expect(respuestas.map((r) => r.status)).toEqual([201, 201])
  })
})
