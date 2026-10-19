/**
 * "Mi turno": la clienta busca su turno y lo cancela desde la web, sin cuenta.
 *
 * Se identifica con el CÓDIGO del turno (el que ve al reservar, "DP-000123")
 * y su TELÉFONO. Las dos cosas tienen que coincidir: el código solo es un
 * número correlativo y no alcanza. Además, las rutas tienen límite de intentos
 * por IP, así no se puede probar a lo bruto.
 *
 * Van por POST y no por GET para que el teléfono no quede en la URL (ni en el
 * historial del navegador ni en los logs del servidor).
 *
 * Cambiar de día = cancelar y reservar otro: la web la lleva a reservar el
 * mismo servicio. Así no hay una segunda forma de reservar que mantener.
 */
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import type { Pool, PoolConnection } from "mysql2/promise"
import { z } from "zod"
import { enTransaccion, pool } from "../core/database/conexion.js"
import { conflicto, HttpError } from "../core/errores.js"
import { leerConfigNumero } from "../shared/configuracion.js"
import { limitarPorIp } from "../core/http/limitarPorIp.js"
import { normalizarTelefonoLocal } from "../shared/telefonoLocal.js"
import { aDateTime, hoy, minutosAhora } from "./tiempo.js"

export const miTurno = Router()

miTurno.use(
  limitarPorIp({
    maximo: 20,
    ventanaMs: 15 * 60_000,
    mensaje: "Hiciste muchos intentos seguidos. Esperá unos minutos o escribinos por WhatsApp.",
  }),
)

/**
 * Si la clienta todavía puede cancelar sola. Hasta `horasMinimas` antes del
 * turno, sí; después, tiene que avisar al local (que puede tener que cubrir
 * el horario). Con 0, hasta que empiece.
 *
 * Fechas como "YYYY-MM-DD HH:MM:SS" del mismo reloj: se pasan a Date igual las
 * dos, así la zona horaria se cancela.
 */
export function puedeCancelar(inicio: string, ahora: string, horasMinimas: number): boolean {
  const aMs = (dt: string) => {
    const [f, h] = dt.split(" ")
    const [y, m, d] = f.split("-").map(Number)
    const [hh, mm] = h.split(":").map(Number)
    return new Date(y, m - 1, d, hh, mm).getTime()
  }
  return aMs(inicio) - aMs(ahora) >= horasMinimas * 3_600_000 && aMs(inicio) > aMs(ahora)
}

/** "DP-000123", "dp 123", "123" -> 123. */
const codigo = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/\D/g, "")))
  .pipe(z.number().int().positive({ message: "Revisá el código del turno" }))

const identificacion = z.object({ codigo, telefono: z.string().trim().min(6).max(30) })

/** El turno si el código y el teléfono coinciden; si no, el mismo error para los dos casos (no se revela cuál falló). */
async function buscar(datos: z.infer<typeof identificacion>, conn: Pool | PoolConnection = pool, bloquear = false) {
  const telefono = await normalizarTelefonoLocal(datos.telefono)
  const noEncontrado = new HttpError(404, "No encontramos un turno con ese código y ese teléfono. Revisá los dos datos.")
  if (!telefono) throw noEncontrado
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT t.id, t.estado, t.fecha_hora_inicio, t.precio, t.servicio_id,
            s.nombre AS servicio, s.duracion_min, c.nombre
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
       JOIN clientes c  ON c.id = t.cliente_id
      WHERE t.id = ? AND c.telefono = ?
      ${bloquear ? "FOR UPDATE" : ""}`,
    [datos.codigo, telefono],
  )
  if (!rows[0]) throw noEncontrado
  return rows[0]
}

async function aRespuesta(r: RowDataPacket) {
  const horasMinimas = await leerConfigNumero("cancelacion_horas_minimas", 24)
  const inicio = String(r.fecha_hora_inicio)
  const pedido = r.estado === "reservado" || r.estado === "confirmado"
  const ahora = aDateTime(hoy(), minutosAhora())
  return {
    codigo: `DP-${String(r.id).padStart(6, "0")}`,
    estado: r.estado as string,
    nombre: r.nombre as string,
    servicio: { id: r.servicio_id as number, nombre: r.servicio as string, duracionMin: r.duracion_min as number },
    fecha: inicio.slice(0, 10),
    hora: inicio.slice(11, 16),
    precio: r.precio as number,
    /** Si la web le muestra el botón de cancelar. */
    puedeCancelar: pedido && puedeCancelar(inicio, ahora, horasMinimas),
    /** Si ya no puede sola porque falta poco (para explicarle y ofrecer WhatsApp). */
    fueraDeTermino: pedido && inicio > ahora && !puedeCancelar(inicio, ahora, horasMinimas),
    horasMinimas,
  }
}

/** POST /api/turnos/mi-turno   { "codigo": "DP-000123", "telefono": "223 555-1234" } */
miTurno.post("/", async (req, res) => {
  res.json(await aRespuesta(await buscar(identificacion.parse(req.body))))
})

/** POST /api/turnos/mi-turno/cancelar   { "codigo": "DP-000123", "telefono": "223 555-1234" } */
miTurno.post("/cancelar", async (req, res) => {
  const datos = identificacion.parse(req.body)
  await enTransaccion(async (conn) => {
    const r = await buscar(datos, conn, true)
    const estado = await aRespuesta(r)
    if (r.estado === "cancelado") return // ya estaba: no es un error, el resultado es el mismo
    if (!estado.puedeCancelar) {
      throw conflicto(
        estado.fueraDeTermino
          ? `Faltan menos de ${estado.horasMinimas} horas para tu turno: para cancelarlo, escribinos por WhatsApp.`
          : "Este turno ya no se puede cancelar.",
      )
    }
    await conn.query("UPDATE turnos SET estado = 'cancelado', cancelado_por = 'clienta', cancelado_at = NOW() WHERE id = ?", [r.id])
  })
  res.json(await aRespuesta(await buscar(datos)))
})
