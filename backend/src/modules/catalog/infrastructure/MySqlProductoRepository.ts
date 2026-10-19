/** Productos en MySQL: el único lugar con SQL sobre la tabla `productos`. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { ProductoRepository } from "../domain/ports.js"
import type { CambiosProducto, DatosProducto, Producto, ProductoVendible } from "../domain/producto.js"
import type { Transaccion } from "../../../core/transaccion.js"

const SELECT = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.imagen_url, p.activo,
         c.id AS categoria_id, c.nombre AS categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id`

function aProducto(r: RowDataPacket): Producto {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    precio: Number(r.precio),
    stock: r.stock,
    imagenUrl: r.imagen_url,
    activo: Boolean(r.activo),
    categoria: r.categoria_id ? { id: r.categoria_id, nombre: r.categoria_nombre } : null,
  }
}

function aColumnas(p: CambiosProducto & { stock?: number }): Record<string, unknown> {
  const c: Record<string, unknown> = {
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    // Solo al crear (stock inicial): después lo maneja el inventario.
    stock: p.stock,
    imagen_url: p.imagenUrl,
    categoria_id: p.categoriaId,
    activo: p.activo,
  }
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined))
}

export class MySqlProductoRepository implements ProductoRepository {
  async listar({ soloActivos, categoriaId, texto }: { soloActivos: boolean; categoriaId?: number; texto?: string }) {
    // En la tienda: activos y de categorías activas (o sin categoría).
    const condiciones = soloActivos ? ["p.activo = 1", "(c.id IS NULL OR c.activo = 1)"] : []
    const params: unknown[] = []
    if (categoriaId) {
      condiciones.push("p.categoria_id = ?")
      params.push(categoriaId)
    }
    if (texto) {
      condiciones.push("(p.nombre LIKE ? OR p.descripcion LIKE ?)")
      params.push(`%${texto}%`, `%${texto}%`)
    }
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `${SELECT} ${condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""}
        ORDER BY ${soloActivos ? "" : "p.activo DESC, "}p.nombre`,
      params,
    )
    return rows.map(aProducto)
  }

  async porId(id: number, { soloActivos }: { soloActivos: boolean }) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(`${SELECT} WHERE p.id = ? ${soloActivos ? "AND p.activo = 1" : ""}`, [id])
    return rows[0] ? aProducto(rows[0]) : null
  }

  async crear(datos: DatosProducto) {
    const [r] = await ejecutor().query<ResultSetHeader>("INSERT INTO productos SET ?", [aColumnas(datos)])
    return r.insertId
  }

  async actualizar(id: number, cambios: CambiosProducto) {
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE productos SET ? WHERE id = ?", [aColumnas(cambios), id])
    return r.affectedRows > 0
  }

  async vendibles(ids: number[], tx?: Transaccion) {
    if (!ids.length) return new Map<number, ProductoVendible>()
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT id, nombre, precio FROM productos WHERE id IN (?) AND activo = 1", [ids])
    return new Map(rows.map((r) => [r.id as number, { id: r.id as number, nombre: r.nombre as string, precio: Number(r.precio) }]))
  }
}
