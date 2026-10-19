/**
 * Ayuda para los tests de integración: pegan contra la app de verdad
 * (supertest, sin levantar el puerto) y contra la base de desarrollo.
 *
 * Para no pisar datos reales:
 *   - las fechas son de 2030 (ningún seed llega ahí), y los días y horas se
 *     eligen según el horario que tenga cargado el local, no fijos,
 *   - los teléfonos son 223 555 99xx (ningún seed los usa),
 *   - todo lo que se crea se anota y `limpiar()` lo borra al final.
 *
 * Se puede apuntar a otra base con DB_NAME (por ejemplo una dp_belleza_test
 * con las mismas migraciones).
 */
import request from "supertest"
import type { RowDataPacket } from "mysql2"
import { app } from "../../src/app.js"
import { pool } from "../../src/core/database/conexion.js"

export const api = () => request(app)

/** Teléfono de prueba, ya normalizado: "5492235559901". */
export const telefono = (n: number) => `54922355599${String(n).padStart(2, "0")}`
/** El mismo, como lo escribiría una clienta: "223 555-9901". */
export const telefonoEscrito = (n: number) => `223 555-99${String(n).padStart(2, "0")}`

const aClave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/**
 * Un día de 2030 en que el local atiende, según el horario que tenga cargado
 * la dueña (no se asume ningún día ni hora). Cada archivo usa su `n`, así no se
 * pisan entre sí: es el n-ésimo día abierto a partir de la semana n de 2030.
 */
export async function diaAbierto(n: number): Promise<string> {
  const horarios = (await api().get("/api/turnos/horarios")).body as { diaSemana: number }[]
  const abiertos = new Set(horarios.map((h) => h.diaSemana))
  if (!abiertos.size) throw new Error("El local no tiene horario de atención cargado: los tests necesitan al menos un día abierto")
  const d = new Date(2030, 0, 7 + 7 * n)
  while (!abiertos.has(d.getDay() || 7)) d.setDate(d.getDate() + 1)
  return aClave(d)
}

/** Un día de 2030 en que el local NO atiende, o null si atiende todos los días. */
export async function diaCerrado(): Promise<string | null> {
  const horarios = (await api().get("/api/turnos/horarios")).body as { diaSemana: number }[]
  const abiertos = new Set(horarios.map((h) => h.diaSemana))
  const d = new Date(2030, 0, 7)
  for (let i = 0; i < 7; i++, d.setDate(d.getDate() + 1)) if (!abiertos.has(d.getDay() || 7)) return aClave(d)
  return null
}

/** Los horarios libres de un servicio ese día, como los ve la web. */
export async function libres(servicioId: number, fecha: string): Promise<string[]> {
  const r = await api().get("/api/turnos/disponibilidad").query({ servicioId, fecha })
  return (r.body as { time: string; available: boolean }[]).filter((s) => s.available).map((s) => s.time)
}

/** Una hora cualquiera a la que el local NO atiende ese día (para probar "fuera de horario"). */
export async function horaCerrada(fecha: string): Promise<string> {
  const dia = new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8))).getDay() || 7
  const horarios = (await api().get("/api/turnos/horarios")).body as { diaSemana: number; desde: string; hasta: string }[]
  const delDia = horarios.filter((h) => h.diaSemana === dia)
  for (let h = 0; h < 24; h++) {
    const hora = `${String(h).padStart(2, "0")}:00`
    if (!delDia.some((f) => hora >= f.desde && hora < f.hasta) && h <= 22) return hora
  }
  throw new Error("El local atiende las 24 horas ese día")
}

/** "10:00" + 15 -> "10:15" */
export const masMinutos = (hora: string, min: number) => {
  const t = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) + min
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

export async function token(): Promise<string> {
  const r = await api().post("/api/auth/login").send({ email: process.env.TEST_ADMIN_EMAIL ?? "admin@dpbelleza.com", password: process.env.TEST_ADMIN_PASSWORD ?? "dp-belleza-2026" })
  if (!r.body.token) throw new Error(`No se pudo iniciar sesión para los tests: ${JSON.stringify(r.body)}`)
  return r.body.token
}

/** Un servicio activo corto (para que entre en cualquier hueco). */
export async function servicioCorto(): Promise<{ id: number; durationMin: number; price: number }> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, duracion_min, precio FROM servicios WHERE activo = 1 ORDER BY duracion_min, id LIMIT 1",
  )
  return { id: rows[0].id, durationMin: rows[0].duracion_min, price: Number(rows[0].precio) }
}

export async function valorConfig(clave: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT valor FROM configuracion WHERE clave = ?", [clave])
  return rows[0]?.valor ?? null
}

export async function ponerConfig(clave: string, valor: string) {
  await pool.query("UPDATE configuracion SET valor = ? WHERE clave = ?", [valor, clave])
}

const creados = { tipos: new Set<number>(), bloqueos: new Set<number>() }
export const anotarTipo = (id: number) => creados.tipos.add(id)
export const anotarBloqueo = (id: number) => creados.bloqueos.add(id)

/** Borra todo lo de prueba: lo de los teléfonos 223 555 99xx, lo de 2030 y lo anotado. */
export async function limpiar() {
  const [clientes] = await pool.query<RowDataPacket[]>("SELECT id FROM clientes WHERE telefono LIKE '54922355599%'")
  const ids = clientes.map((c) => c.id)
  // Los cobros no se borran con el turno (quedan en la caja): se limpian primero.
  await pool.query("DELETE FROM cobros WHERE descripcion LIKE 'TEST%'")
  if (ids.length) {
    await pool.query("DELETE FROM cobros WHERE cliente_id IN (?) OR turno_id IN (SELECT id FROM turnos WHERE cliente_id IN (?))", [ids, ids])
    await pool.query("DELETE i FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id WHERE p.cliente_id IN (?)", [ids])
    await pool.query("DELETE FROM pedidos WHERE cliente_id IN (?)", [ids])
    await pool.query("DELETE FROM recordatorios WHERE cliente_id IN (?) OR turno_id IN (SELECT id FROM turnos WHERE cliente_id IN (?))", [ids, ids])
    await pool.query("DELETE FROM turnos WHERE cliente_id IN (?)", [ids])
    await pool.query("DELETE FROM clientes WHERE id IN (?)", [ids])
  }
  if (creados.tipos.size) await pool.query("DELETE FROM tipos_recordatorio WHERE id IN (?)", [[...creados.tipos]])
  if (creados.bloqueos.size) await pool.query("DELETE FROM bloqueos WHERE id IN (?)", [[...creados.bloqueos]])
  await pool.query("DELETE FROM bloqueos WHERE fecha_hora_inicio >= '2030-01-01' AND motivo LIKE 'TEST%'")
}

export async function cerrar() {
  await limpiar()
  await pool.end()
}
