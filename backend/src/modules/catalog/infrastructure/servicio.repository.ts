/** Servicios en MySQL: el único lugar con SQL sobre la tabla `servicios`. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { ServicioRepository } from "../domain/catalogo.ports.js"
import type { CambiosServicio, Etiqueta, Servicio } from "../domain/servicio.model.js"

const COLUMNAS = `id, nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye,
                  profesional, badge, sesiones_recomendadas, duracion_min, precio, activo`

function aServicio(r: RowDataPacket): Servicio {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    precio: Number(r.precio),
    duracionMin: r.duracion_min,
    imagenUrl: r.imagen_url,
    descripcionCorta: r.descripcion_corta,
    descripcion: r.descripcion,
    // `incluye` es una columna JSON: mysql2 la devuelve ya parseada.
    incluye: Array.isArray(r.incluye) ? r.incluye : [],
    profesional: r.profesional,
    etiqueta: (r.badge ?? null) as Etiqueta | null,
    sesionesRecomendadas: r.sesiones_recomendadas,
    activo: r.activo === 1,
  }
}

function aColumnas(d: CambiosServicio): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  if (d.nombre !== undefined) c.nombre = d.nombre
  if (d.categoria !== undefined) c.categoria = d.categoria
  if (d.precio !== undefined) c.precio = d.precio
  if (d.duracionMin !== undefined) c.duracion_min = d.duracionMin
  if (d.descripcionCorta !== undefined) c.descripcion_corta = d.descripcionCorta
  if (d.descripcion !== undefined) c.descripcion = d.descripcion
  if (d.imagenUrl !== undefined) c.imagen_url = d.imagenUrl
  if (d.incluye !== undefined) c.incluye = JSON.stringify(d.incluye)
  if (d.profesional !== undefined) c.profesional = d.profesional
  if (d.etiqueta !== undefined) c.badge = d.etiqueta
  if (d.sesionesRecomendadas !== undefined) c.sesiones_recomendadas = d.sesionesRecomendadas
  if (d.activo !== undefined) c.activo = d.activo ? 1 : 0
  return c
}

export class MySqlServicioRepository implements ServicioRepository {
  async listar({ incluirPausados }: { incluirPausados: boolean }) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM servicios ${incluirPausados ? "" : "WHERE activo = 1"} ORDER BY categoria, nombre`,
    )
    return rows.map(aServicio)
  }

  async porId(id: number, { incluirPausados }: { incluirPausados: boolean }) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM servicios WHERE id = ? ${incluirPausados ? "" : "AND activo = 1"}`,
      [id],
    )
    return rows[0] ? aServicio(rows[0]) : null
  }

  async crear(datos: CambiosServicio) {
    const [r] = await ejecutor().query<ResultSetHeader>("INSERT INTO servicios SET ?", [aColumnas({ incluye: [], ...datos })])
    return r.insertId
  }

  async actualizar(id: number, cambios: CambiosServicio) {
    const columnas = aColumnas(cambios)
    if (!Object.keys(columnas).length) return (await this.porId(id, { incluirPausados: true })) !== null
    const [r] = await ejecutor().query<ResultSetHeader>("UPDATE servicios SET ? WHERE id = ?", [columnas, id])
    return r.affectedRows > 0
  }

  async categoriasEnUso(sinContarServicioId = 0) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT categoria FROM servicios WHERE id <> ? GROUP BY categoria ORDER BY COUNT(*) DESC, categoria",
      [sinContarServicioId],
    )
    return rows.map((r) => String(r.categoria))
  }
}
