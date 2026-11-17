/** La cuenta de la API de Andreani del local (una sola fila), con la contraseña cifrada. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import { cifrar, descifrar } from "../../../core/seguridad/cifrado.util.js"
import type { CuentaAndreani, CuentaAndreaniRepository } from "../models/envios.ports.js"

async function fila() {
  const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT * FROM andreani_cuenta WHERE id = 1")
  return rows[0] ?? null
}

export class MySqlCuentaAndreaniRepository implements CuentaAndreaniRepository {
  async leer() {
    const r = await fila()
    if (!r) return null
    return { usuario: r.usuario, password: descifrar(r.password_cifrado), cliente: r.cliente, contrato: r.contrato, entorno: r.entorno }
  }

  async resumen() {
    const r = await fila()
    if (!r) return null
    return { usuario: r.usuario, cliente: r.cliente, contrato: r.contrato, entorno: r.entorno, verificadaAt: r.verificada_at ? String(r.verificada_at).slice(0, 16) : null }
  }

  async guardar(c: CuentaAndreani) {
    await ejecutor().query(
      `INSERT INTO andreani_cuenta (id, usuario, password_cifrado, cliente, contrato, entorno, verificada_at)
       VALUES (1, ?, ?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE usuario = VALUES(usuario), password_cifrado = VALUES(password_cifrado),
         cliente = VALUES(cliente), contrato = VALUES(contrato), entorno = VALUES(entorno), verificada_at = NULL`,
      [c.usuario, cifrar(c.password), c.cliente, c.contrato, c.entorno],
    )
  }

  async marcarVerificada() {
    await ejecutor().query("UPDATE andreani_cuenta SET verificada_at = NOW() WHERE id = 1")
  }

  async borrar() {
    await ejecutor().query("DELETE FROM andreani_cuenta WHERE id = 1")
  }
}
