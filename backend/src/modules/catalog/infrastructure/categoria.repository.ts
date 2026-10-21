/** Categorías de productos en MySQL (las de servicios son texto libre en cada servicio). */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { CategoriaRepository } from "../domain/catalogo.ports.js"
import type { Categoria } from "../domain/producto.model.js"

const aCategoria = (r: RowDataPacket): Categoria => ({ id: r.id, nombre: r.nombre, activo: Boolean(r.activo) })

export class MySqlCategoriaRepository implements CategoriaRepository {
  async listar({ soloActivas }: { soloActivas: boolean }) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT id, nombre, activo FROM categorias ${soloActivas ? "WHERE activo = 1" : ""} ORDER BY nombre`,
    )
    return rows.map(aCategoria)
  }

  async porId(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT id, nombre, activo FROM categorias WHERE id = ?", [id])
    return rows[0] ? aCategoria(rows[0]) : null
  }

  async crear({ nombre, activo }: { nombre: string; activo: boolean }) {
    const [r] = await ejecutor().query<ResultSetHeader>("INSERT INTO categorias (nombre, activo) VALUES (?, ?)", [nombre, activo])
    return r.insertId
  }

  async actualizar(id: number, cambios: Partial<{ nombre: string; activo: boolean }>) {
    if (!Object.keys(cambios).length) return (await this.porId(id)) !== null
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE categorias SET ? WHERE id = ?", [cambios, id])
    return r.affectedRows > 0
  }
}
