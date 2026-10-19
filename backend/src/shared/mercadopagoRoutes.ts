/**
 * Rutas públicas de Mercado Pago, montadas en /api/mercadopago.
 *
 * POST /webhook: Mercado Pago avisa acá cuando cambia un pago. Para que llegue,
 * la URL tiene que ser pública (en local no lo es: ver backend/README.md).
 *
 * No se confía en el cuerpo de la notificación: solo se toma el id del pago y
 * se lo consulta a Mercado Pago con el token del local. Si además hay clave
 * secreta del webhook cargada, se verifica la firma y se rechaza lo que no
 * venga firmado.
 */
import { Router } from "express"
import { z } from "zod"
import { pool } from "../core/database/conexion.js"
import { consultarPago, cuentaMercadoPago, firmaValida } from "./mercadopago.js"
import { aplicarPagoSena } from "../turnera/sena.js"

export const mercadopagoPublico = Router()

mercadopagoPublico.post("/webhook", async (req, res) => {
  // Mercado Pago manda el id en el body (webhooks) o en la query (IPN vieja).
  const tipo = String(req.body?.type ?? req.query.type ?? req.query.topic ?? "")
  const dataId = String(req.body?.data?.id ?? req.query["data.id"] ?? req.query.id ?? "")
  if (tipo !== "payment" || !/^\d+$/.test(dataId)) {
    res.status(200).json({ ignorado: true }) // otros eventos: se contesta 200 para que no reintente
    return
  }

  const cuenta = await cuentaMercadoPago()
  if (!cuenta) {
    res.status(503).json({ error: "Mercado Pago no está configurado" })
    return
  }
  if (cuenta.webhookSecret && !firmaValida(cuenta.webhookSecret, req.header("x-signature"), req.header("x-request-id"), dataId)) {
    res.status(401).json({ error: "Firma inválida" })
    return
  }

  const pago = await consultarPago(dataId)
  await pool.query(
    `INSERT INTO mercadopago_pagos (pago_id, estado, estado_detalle, monto, referencia_externa, datos)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), estado_detalle = VALUES(estado_detalle),
       monto = VALUES(monto), referencia_externa = VALUES(referencia_externa), datos = VALUES(datos)`,
    [pago.id, pago.status, pago.status_detail, pago.transaction_amount, pago.external_reference, JSON.stringify(pago)],
  )
  // Seña de un turno: referencia "turno-<id>" (ver turnera/sena.ts). Los pedidos de la tienda los resuelve ecommerce.
  const turno = /^turno-(\d+)$/.exec(pago.external_reference ?? "")
  if (turno) await aplicarPagoSena(Number(turno[1]), pago)
  res.status(200).json({ ok: true })
})

/** GET /estado-pago?referencia=pedido-15 — para que la web muestre "¡pago aprobado!" al volver de Mercado Pago. */
mercadopagoPublico.get("/estado-pago", async (req, res) => {
  const { referencia } = z.object({ referencia: z.string().min(1).max(100) }).parse(req.query)
  const [rows] = await pool.query(
    "SELECT estado FROM mercadopago_pagos WHERE referencia_externa = ? ORDER BY updated_at DESC LIMIT 1",
    [referencia],
  )
  const fila = (rows as { estado: string }[])[0]
  res.json({ estado: fila?.estado ?? null })
})
