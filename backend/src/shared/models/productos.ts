import type { RowDataPacket } from "mysql2"

export const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.imagen_url, p.activo,
         p.created_at, p.updated_at, c.id AS categoria_id, c.nombre AS categoria_nombre
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id`

export function aProducto(row: RowDataPacket) {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    descripcion: row.descripcion as string | null,
    precio: row.precio as number,
    stock: row.stock as number,
    imagenUrl: row.imagen_url as string | null,
    activo: Boolean(row.activo),
    categoria: row.categoria_id ? { id: row.categoria_id as number, nombre: row.categoria_nombre as string } : null,
    creadoEn: row.created_at as Date,
    actualizadoEn: row.updated_at as Date,
  }
}
