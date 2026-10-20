/** La cuenta de Mercado Pago del local (una sola fila), con el token y la clave del webhook cifrados. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import { cifrar, descifrar } from "../../../core/seguridad/cifrado.js"
import type { ModoCuenta } from "../domain/mercadoPago.js"
import type { CuentaRepository } from "../domain/payments.ports.js"

async function fila() {
  const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT * FROM mercadopago_cuenta WHERE id = 1")
  return rows[0] ?? null
}

export class MySqlCuentaRepository implements CuentaRepository {
  async leer() {
    const r = await fila()
    if (!r) return null
    return {
      accessToken: descifrar(r.access_token_cifrado),
      publicKey: r.public_key,
      webhookSecret: r.webhook_secret_cifrado ? descifrar(r.webhook_secret_cifrado) : null,
      modo: r.modo,
    }
  }

  async resumen() {
    const r = await fila()
    if (!r) return null
    return {
      modo: r.modo,
      cuenta: r.cuenta_nombre,
      publicKey: r.public_key,
      tokenFinal: r.token_final,
      webhookSecretCargado: Boolean(r.webhook_secret_cifrado),
      verificadaAt: r.verificada_at ? String(r.verificada_at).slice(0, 16) : null,
    }
  }

  async guardar(c: { accessToken: string; publicKey: string; webhookSecret: string | null; modo: ModoCuenta; cuenta: string }) {
    await ejecutor().query(
      `INSERT INTO mercadopago_cuenta
           (id, access_token_cifrado, public_key, webhook_secret_cifrado, token_final, modo, cuenta_nombre, verificada_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
           access_token_cifrado = VALUES(access_token_cifrado), public_key = VALUES(public_key),
           webhook_secret_cifrado = COALESCE(VALUES(webhook_secret_cifrado), webhook_secret_cifrado),
           token_final = VALUES(token_final), modo = VALUES(modo), cuenta_nombre = VALUES(cuenta_nombre),
           verificada_at = NOW()`,
      [cifrar(c.accessToken), c.publicKey, c.webhookSecret ? cifrar(c.webhookSecret) : null, c.accessToken.slice(-4), c.modo, c.cuenta],
    )
  }

  async marcarVerificada(modo: ModoCuenta, cuenta: string) {
    await ejecutor().query("UPDATE mercadopago_cuenta SET modo = ?, cuenta_nombre = ?, verificada_at = NOW() WHERE id = 1", [modo, cuenta])
  }

  async borrar() {
    await ejecutor().query("DELETE FROM mercadopago_cuenta WHERE id = 1")
  }
}
