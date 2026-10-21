/** Las usuarias del panel en MySQL (tabla `usuarios`): el ÚNICO lugar que la lee o escribe. */
import type { RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import { conflicto } from "../../../core/negocio.error.js"
import type { Usuario } from "../domain/usuario.model.js"
import type { UsuariosRepository } from "../domain/auth.ports.js"

const COLUMNAS = "id, nombre, email, rol, password_hash"

const aUsuario = (r: RowDataPacket): Usuario => ({
  id: r.id,
  nombre: r.nombre,
  email: r.email,
  rol: r.rol,
  passwordHash: r.password_hash,
})

export class MySqlUsuariosRepository implements UsuariosRepository {
  async porEmail(email: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`SELECT ${COLUMNAS} FROM usuarios WHERE email = ? AND activo = 1`, [email])
    return rows[0] ? aUsuario(rows[0]) : null
  }

  async porId(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`SELECT ${COLUMNAS} FROM usuarios WHERE id = ? AND activo = 1`, [id])
    return rows[0] ? aUsuario(rows[0]) : null
  }

  async actualizarDatos(id: number, { nombre, email }: { nombre: string; email: string }) {
    try {
      await ejecutor().query("UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?", [nombre, email, id])
    } catch (err) {
      if ((err as { code?: string }).code === "ER_DUP_ENTRY") throw conflicto("Ese email ya lo usa otra cuenta.")
      throw err
    }
  }

  async cambiarHash(id: number, hash: string) {
    await ejecutor().query("UPDATE usuarios SET password_hash = ? WHERE id = ?", [hash, id])
  }

  async guardarAdmin({ nombre, email, hash }: { nombre: string; email: string; hash: string }) {
    await ejecutor().query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), password_hash = VALUES(password_hash), activo = 1`,
      [nombre, email, hash],
    )
  }
}
