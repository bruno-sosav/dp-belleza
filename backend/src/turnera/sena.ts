/**
 * Seña de los turnos con Mercado Pago.
 *
 * La dueña elige un porcentaje (Ajustes → Mercado Pago; 0 = sin seña). Al
 * reservar desde la web:
 *   1. el turno se crea 'reservado' con la seña 'pendiente' y un plazo para
 *      pagar (SENA_MINUTOS). Mientras no venza, ocupa el horario;
 *   2. la clienta paga en Mercado Pago;
 *   3. cuando el pago está aprobado, el turno pasa a 'confirmado' y la seña a
 *      'pagada'. Eso llega por el webhook o cuando la clienta vuelve a la web
 *      (GET /api/turnos/sena/:token), lo que pase primero;
 *   4. si vence sin pagar, `vencerSenas()` lo cancela (cancelado_por =
 *      'sistema') y el horario queda libre.
 *
 * Los turnos que da la dueña desde el panel no llevan seña: los arregló ella.
 */
import { randomBytes } from "node:crypto"
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { config } from "../shared/config.js"
import { enTransaccion, pool } from "../shared/db.js"
import { leerConfigNumero } from "../shared/configuracion.js"
import { HttpError } from "../shared/errors.js"
import { consultarPago, crearPreferencia, cuentaMercadoPago } from "../shared/mercadopago.js"
import type { PagoMP } from "../shared/mercadopago.js"
import { seSolapan, aMinutos } from "./tiempo.js"

/** Minutos que tiene la clienta para pagar antes de que se libere el horario. */
export const SENA_MINUTOS = 30

/** Seña en pesos enteros. 0 si no hay porcentaje. */
export function montoSena(precio: number, porcentaje: number): number {
  if (porcentaje <= 0) return 0
  return Math.max(1, Math.round((precio * Math.min(porcentaje, 100)) / 100))
}

/** El porcentaje que se cobra de verdad: 0 si Mercado Pago no está conectado. */
export async function porcentajeSena(): Promise<number> {
  const porcentaje = await leerConfigNumero("sena_porcentaje", 0)
  if (porcentaje <= 0) return 0
  return (await cuentaMercadoPago()) ? porcentaje : 0
}

export const nuevoTokenSena = () => randomBytes(16).toString("hex")

/**
 * Condición SQL (sobre la tabla `turnos`, sin alias) que deja afuera los turnos
 * con la seña vencida sin pagar: esos ya no ocupan el horario, aunque
 * vencerSenas() todavía no haya pasado a cancelarlos.
 */
export const SQL_SENA_NO_VENCIDA =
  "NOT (estado = 'reservado' AND sena_estado = 'pendiente' AND sena_vence_at IS NOT NULL AND sena_vence_at < NOW())"

/** Cancela los turnos cuya seña venció sin pagar. Corre cada minuto (index.ts). */
export async function vencerSenas(): Promise<number> {
  const [r] = await pool.query(
    `UPDATE turnos
        SET estado = 'cancelado', cancelado_por = 'sistema', cancelado_at = NOW(), sena_estado = 'vencida'
      WHERE estado = 'reservado' AND sena_estado = 'pendiente' AND sena_vence_at < NOW()`,
  )
  return (r as { affectedRows: number }).affectedRows
}

/** El link de pago de la seña de un turno. */
export async function linkDePago(turno: { id: number; servicio: string; fecha: string; hora: string; monto: number; token: string }) {
  const vuelta = `${config.siteUrl}/reserva/pago?t=${turno.token}`
  const { link } = await crearPreferencia({
    items: [{ titulo: `Seña: ${turno.servicio} (${turno.fecha.split("-").reverse().join("/")} ${turno.hora})`, cantidad: 1, precioUnitario: turno.monto }],
    referenciaExterna: `turno-${turno.id}`,
    urlsDeVuelta: { exito: vuelta, pendiente: vuelta, error: vuelta },
    ...(config.apiPublicUrl ? { urlNotificacion: `${config.apiPublicUrl}/api/mercadopago/webhook` } : {}),
  })
  return link
}

/**
 * Aplica un pago de Mercado Pago a la seña de un turno. Lo llaman el webhook y
 * la vuelta de la clienta; puede llegar dos veces: el segundo no cambia nada.
 *
 * Si el pago llega después de que la seña venció (pagó tarde) y el horario
 * sigue libre, el turno se recupera. Si ya lo tomó otra persona, queda
 * cancelado con la seña 'pagada': el panel lo muestra para que la dueña la
 * devuelva o le ofrezca otro horario.
 */
export async function aplicarPagoSena(turnoId: number, pago: PagoMP): Promise<void> {
  if (pago.status !== "approved") return
  await enTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT * FROM turnos WHERE id = ? FOR UPDATE", [turnoId])
    const t = rows[0]
    if (!t || t.sena_estado === "pagada" || t.sena_monto === null) return
    if (Number(pago.transaction_amount) + 0.01 < Number(t.sena_monto)) return // pagó de menos: no es esta seña

    let estado = t.estado as string
    let canceladoPor = t.cancelado_por as string | null
    if (estado === "reservado") estado = "confirmado"
    else if (estado === "cancelado" && canceladoPor === "sistema") {
      const inicio = String(t.fecha_hora_inicio)
      const desde = aMinutos(inicio.slice(11, 16))
      const hasta = aMinutos(String(t.fecha_hora_fin).slice(11, 16))
      const [otros] = await conn.query<RowDataPacket[]>(
        `SELECT fecha_hora_inicio, fecha_hora_fin FROM turnos
          WHERE DATE(fecha_hora_inicio) = ? AND id <> ? AND estado IN ('reservado', 'confirmado', 'completado') AND ${SQL_SENA_NO_VENCIDA}
          FOR UPDATE`,
        [inicio.slice(0, 10), turnoId],
      )
      const libre = !otros.some((o) =>
        seSolapan(desde, hasta, aMinutos(String(o.fecha_hora_inicio).slice(11, 16)), aMinutos(String(o.fecha_hora_fin).slice(11, 16))),
      )
      if (libre) {
        estado = "confirmado"
        canceladoPor = null
      }
    }
    await conn.query(
      `UPDATE turnos SET sena_estado = 'pagada', sena_pago_id = ?, estado = ?, cancelado_por = ?,
              cancelado_at = IF(? IS NULL, NULL, cancelado_at)
        WHERE id = ?`,
      [pago.id, estado, canceladoPor, canceladoPor, turnoId],
    )
  })
}

// ---------------------------------------------------------------- rutas públicas

export const senaPublica = Router()

async function porToken(token: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.estado, t.fecha_hora_inicio, t.precio, t.sena_monto, t.sena_estado, t.sena_vence_at, t.sena_token,
            (t.sena_vence_at < NOW()) AS vencida, s.nombre AS servicio
       FROM turnos t JOIN servicios s ON s.id = t.servicio_id
      WHERE t.sena_token = ?`,
    [token],
  )
  if (!rows[0]) throw new HttpError(404, "No encontramos ese pago.")
  return rows[0]
}

function aRespuesta(r: RowDataPacket) {
  const inicio = String(r.fecha_hora_inicio)
  return {
    codigo: `DP-${String(r.id).padStart(6, "0")}`,
    estado: r.estado as string,
    sena: { monto: Number(r.sena_monto), estado: r.sena_estado as "pendiente" | "pagada" | "vencida" },
    servicio: r.servicio as string,
    fecha: inicio.slice(0, 10),
    hora: inicio.slice(11, 16),
    precio: Number(r.precio),
    /** "2026-10-17 12:30": hasta cuándo puede pagar, si sigue pendiente. */
    venceA: r.sena_vence_at ? String(r.sena_vence_at).slice(0, 16) : null,
  }
}

const token = z.string().regex(/^[0-9a-f]{32}$/, "Link de pago inválido")

/**
 * GET /api/turnos/sena/:token?payment_id=123
 *
 * La web llama acá cuando la clienta vuelve de Mercado Pago (que agrega
 * payment_id a la URL). Si viene el id del pago, se consulta a Mercado Pago
 * y se aplica: así el turno se confirma aunque el webhook no llegue.
 */
senaPublica.get("/:token", async (req, res) => {
  const t = await porToken(token.parse(req.params.token))
  const pagoId = z.string().regex(/^\d+$/).optional().parse(req.query.payment_id)
  if (pagoId && t.sena_estado !== "pagada") {
    const pago = await consultarPago(pagoId)
    // Que el pago sea de ESTE turno: si no, alguien podría usar un pago suyo de otra cosa.
    if (pago.external_reference === `turno-${t.id}`) await aplicarPagoSena(t.id, pago)
  }
  res.json(aRespuesta(await porToken(t.sena_token)))
})

/** POST /api/turnos/sena/:token/pagar — un link de pago nuevo, si la seña sigue pendiente y no venció. */
senaPublica.post("/:token/pagar", async (req, res) => {
  const t = await porToken(token.parse(req.params.token))
  if (t.sena_estado !== "pendiente" || t.estado !== "reservado" || t.vencida) {
    throw new HttpError(409, "Esta seña ya no se puede pagar. Si querés el turno, reservalo de nuevo.")
  }
  const inicio = String(t.fecha_hora_inicio)
  const link = await linkDePago({ id: t.id, servicio: t.servicio, fecha: inicio.slice(0, 10), hora: inicio.slice(11, 16), monto: Number(t.sena_monto), token: t.sena_token })
  res.json({ link })
})
