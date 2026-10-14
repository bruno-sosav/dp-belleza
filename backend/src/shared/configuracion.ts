/**
 * Tabla `configuracion`: parámetros que la dueña edita desde el panel sin que
 * nadie toque código (intervalo entre turnos, horas de anticipación del
 * recordatorio, teléfono del local, etc.).
 */
import type { RowDataPacket } from "mysql2"
import { db } from "./db.ts"

export async function leerConfig(clave: string): Promise<string | null> {
  const [rows] = await db.query<RowDataPacket[]>(
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
