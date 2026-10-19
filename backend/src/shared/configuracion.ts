/**
 * Tabla `configuracion`: parámetros que la dueña edita desde el panel sin que
 * nadie toque código (intervalo entre turnos, horas de anticipación del
 * recordatorio, teléfono del local, etc.).
 */
import type { RowDataPacket } from "mysql2"
import { pool } from "./db.js"

export async function leerConfig(clave: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT valor FROM configuracion WHERE clave = ?",
    [clave],
  )
  return rows.length > 0 ? (rows[0].valor as string) : null
}

export async function leerConfigNumero(clave: string, porDefecto: number): Promise<number> {
  const valor = await leerConfig(clave)
  const n = Number(valor)
  return valor !== null && Number.isFinite(n) ? n : porDefecto
}

/**
 * Lo que la web pública puede leer (GET /api/configuracion): datos de
 * contacto. El resto (texto del recordatorio, intervalos) es del panel.
 */
export const CLAVES_PUBLICAS = [
  "nombre_negocio",
  "telefono_negocio",
  "direccion_negocio",
  "email_negocio",
  "cancelacion_horas_minimas",
  "reserva_anticipacion_min_horas",
  "reserva_anticipacion_max_dias",
] as const

export async function leerConfigs(claves?: readonly string[]): Promise<Record<string, string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    claves ? "SELECT clave, valor FROM configuracion WHERE clave IN (?)" : "SELECT clave, valor FROM configuracion",
    claves ? [claves] : [],
  )
  return Object.fromEntries(rows.map((r) => [r.clave as string, r.valor as string]))
}
