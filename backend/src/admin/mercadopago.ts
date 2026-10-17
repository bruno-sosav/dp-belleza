/**
 * Panel: credenciales de Mercado Pago (Ajustes → Mercado Pago).
 *
 * Las credenciales NUNCA vuelven enteras al navegador: el panel solo ve si está
 * configurado, los últimos 4 caracteres del token, la cuenta y el modo. Para
 * cambiarlas se cargan de nuevo.
 *
 * Antes de guardar se prueban contra Mercado Pago: si el token no sirve, no se
 * guarda, así no queda una configuración rota que recién se descubre al cobrar.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../shared/db.js"
import { cifrar, descifrar } from "../shared/cifrado.js"
import { malaPeticion, noEncontrado } from "../shared/errors.js"
import { usuarioDelToken } from "../shared/mercadopago.js"

export const adminMercadoPago = Router()

async function estado() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM mercadopago_cuenta WHERE id = 1")
  const r = rows[0]
  if (!r) return { configurada: false as const }
  return {
    configurada: true as const,
    modo: r.modo as "prueba" | "produccion",
    cuenta: r.cuenta_nombre as string | null,
    publicKey: r.public_key as string,
    tokenFinal: r.token_final as string,
    webhookSecretCargado: Boolean(r.webhook_secret_cifrado),
    verificadaAt: r.verificada_at ? String(r.verificada_at).slice(0, 16) : null,
  }
}

/** Prueba de cuenta y modo. Las credenciales de prueba empiezan con TEST- o son de un usuario de prueba. */
async function verificar(accessToken: string) {
  const usuario = await usuarioDelToken(accessToken)
  const deprueba = accessToken.startsWith("TEST-") || /^TEST/i.test(usuario.nickname)
  return {
    modo: (deprueba ? "prueba" : "produccion") as "prueba" | "produccion",
    cuenta: [usuario.nickname, usuario.email].filter(Boolean).join(" · "),
  }
}

/** GET /api/admin/mercadopago */
adminMercadoPago.get("/mercadopago", async (_req, res) => {
  res.json(await estado())
})

/**
 * PUT /api/admin/mercadopago
 *   { "accessToken": "APP_USR-...", "publicKey": "APP_USR-...", "webhookSecret": "..." }
 *
 * Reemplaza las credenciales. `webhookSecret` es opcional: si no viene, se
 * conserva el que había.
 */
adminMercadoPago.put("/mercadopago", async (req, res) => {
  const d = z
    .object({
      accessToken: z.string().trim().regex(/^(APP_USR|TEST)-[\w-]{20,}$/, "El Access Token empieza con APP_USR- o TEST-"),
      publicKey: z.string().trim().regex(/^(APP_USR|TEST)-[\w-]{20,}$/, "La Public Key empieza con APP_USR- o TEST-"),
      webhookSecret: z.string().trim().min(10).max(200).optional(),
    })
    .parse(req.body)
  if (d.accessToken.startsWith("TEST-") !== d.publicKey.startsWith("TEST-")) {
    throw malaPeticion("El Access Token y la Public Key tienen que ser los dos de prueba o los dos de producción.")
  }

  const { modo, cuenta } = await verificar(d.accessToken)

  await pool.query(
    `INSERT INTO mercadopago_cuenta
         (id, access_token_cifrado, public_key, webhook_secret_cifrado, token_final, modo, cuenta_nombre, verificada_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
         access_token_cifrado = VALUES(access_token_cifrado), public_key = VALUES(public_key),
         webhook_secret_cifrado = COALESCE(VALUES(webhook_secret_cifrado), webhook_secret_cifrado),
         token_final = VALUES(token_final), modo = VALUES(modo), cuenta_nombre = VALUES(cuenta_nombre),
         verificada_at = NOW()`,
    [cifrar(d.accessToken), d.publicKey, d.webhookSecret ? cifrar(d.webhookSecret) : null, d.accessToken.slice(-4), modo, cuenta],
  )
  res.json(await estado())
})

/** POST /api/admin/mercadopago/probar — vuelve a probar las credenciales guardadas. */
adminMercadoPago.post("/mercadopago/probar", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT access_token_cifrado FROM mercadopago_cuenta WHERE id = 1")
  if (!rows[0]) throw noEncontrado("Configuración de Mercado Pago")
  const { modo, cuenta } = await verificar(descifrar(rows[0].access_token_cifrado))
  await pool.query("UPDATE mercadopago_cuenta SET modo = ?, cuenta_nombre = ?, verificada_at = NOW() WHERE id = 1", [modo, cuenta])
  res.json(await estado())
})

/** DELETE /api/admin/mercadopago — desconecta la cuenta. */
adminMercadoPago.delete("/mercadopago", async (_req, res) => {
  await pool.query("DELETE FROM mercadopago_cuenta WHERE id = 1")
  res.status(204).end()
})
