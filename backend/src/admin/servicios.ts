/**
 * Panel: el catálogo de servicios.
 *
 * Lo que se carga acá es lo que ve la clienta en la web (GET /api/turnos/servicios)
 * y lo que se puede reservar. Los turnos ya dados no cambian al editar un
 * servicio: guardan su propio precio y su propio horario de fin.
 *
 * No hay DELETE: un servicio con turnos no se puede borrar sin perder el
 * historial de Finanzas, así que se PAUSA (activo = 0). Pausado no aparece en la
 * web ni se puede reservar, pero sus turnos siguen ahí.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { enTransaccion, pool } from "../core/database/conexion.js"
import { noEncontrado } from "../core/errores.js"
import { aServicioDTO, type ServicioDTO } from "../turnera/service.js"

export const adminServicios = Router()

const idParam = z.coerce.number().int().positive()

export type ServicioAdminDTO = ServicioDTO & {
  activo: boolean
  /** Turnos pedidos de hoy en adelante: para avisar antes de pausarlo. */
  turnosProximos: number
}

const SELECT_SERVICIO = `
  SELECT s.id, s.nombre, s.categoria, s.descripcion_corta, s.descripcion, s.imagen_url,
         s.incluye, s.profesional, s.badge, s.sesiones_recomendadas, s.duracion_min, s.precio,
         s.activo,
         (SELECT COUNT(*) FROM turnos t
           WHERE t.servicio_id = s.id
             AND t.estado IN ('reservado', 'confirmado')
             AND t.fecha_hora_inicio >= NOW()) AS turnos_proximos
    FROM servicios s`

function aServicioAdmin(r: RowDataPacket): ServicioAdminDTO {
  return { ...aServicioDTO(r), activo: r.activo === 1, turnosProximos: Number(r.turnos_proximos) }
}

async function buscarServicio(id: number): Promise<ServicioAdminDTO> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_SERVICIO} WHERE s.id = ?`, [id])
  if (!rows[0]) throw noEncontrado("Servicio")
  return aServicioAdmin(rows[0])
}

/** "" y espacios -> null, para los campos opcionales de texto. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null)

// Mismas claves que ServicioDTO (lo que devuelve el GET), así el panel edita
// lo que recibe y lo manda de vuelta tal cual.
const datosServicio = z.object({
  name: z.string().trim().min(1).max(150),
  category: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .transform((v) => v.replace(/\s+/g, " ")),
  price: z.number().min(0).max(100_000_000),
  durationMin: z.number().int().min(5).max(600),
  shortDescription: textoOpcional(255),
  description: textoOpcional(5000),
  image: z.url().max(500).nullable().or(z.literal("").transform(() => null)),
  includes: z.array(z.string().trim().min(1).max(200)).max(20),
  professional: textoOpcional(100),
  badge: z.enum(["Nuevo", "Más elegido", "Promo"]).nullable(),
  recommendedSessions: z.number().int().min(1).max(50).nullable(),
  activo: z.boolean(),
})
const nuevoServicio = datosServicio.partial({
  shortDescription: true,
  description: true,
  image: true,
  includes: true,
  professional: true,
  badge: true,
  recommendedSessions: true,
  activo: true,
})
const cambiosServicio = datosServicio.partial()

/**
 * Si ya hay una categoría que se escribe igual sin contar mayúsculas ni tildes
 * ("masajes" / "Masajes", "depilacion" / "Depilación"), se usa esa. La
 * comparación la hace MySQL con la collation de la columna (ai_ci).
 */
async function categoriaExistente(conn: PoolConnection, categoria: string, sinContar?: number) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT categoria, COUNT(*) AS n FROM servicios
      WHERE categoria = ? AND id <> ?
      GROUP BY categoria ORDER BY n DESC LIMIT 1`,
    [categoria, sinContar ?? 0],
  )
  return rows[0] ? String(rows[0].categoria) : categoria
}

function aColumnas(datos: z.infer<typeof cambiosServicio>) {
  const c: Record<string, unknown> = {}
  if (datos.name !== undefined) c.nombre = datos.name
  if (datos.category !== undefined) c.categoria = datos.category
  if (datos.price !== undefined) c.precio = datos.price
  if (datos.durationMin !== undefined) c.duracion_min = datos.durationMin
  if (datos.shortDescription !== undefined) c.descripcion_corta = datos.shortDescription
  if (datos.description !== undefined) c.descripcion = datos.description
  if (datos.image !== undefined) c.imagen_url = datos.image
  if (datos.includes !== undefined) c.incluye = JSON.stringify(datos.includes)
  if (datos.professional !== undefined) c.profesional = datos.professional
  if (datos.badge !== undefined) c.badge = datos.badge
  if (datos.recommendedSessions !== undefined) c.sesiones_recomendadas = datos.recommendedSessions
  if (datos.activo !== undefined) c.activo = datos.activo ? 1 : 0
  return c
}

/** GET /api/admin/servicios — todos, también los pausados. */
adminServicios.get("/servicios", async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_SERVICIO} ORDER BY s.categoria, s.nombre`)
  res.json(rows.map(aServicioAdmin))
})

adminServicios.get("/servicios/:id", async (req, res) => {
  res.json(await buscarServicio(idParam.parse(req.params.id)))
})

/** POST /api/admin/servicios */
adminServicios.post("/servicios", async (req, res) => {
  const datos = nuevoServicio.parse(req.body)
  const id = await enTransaccion(async (conn) => {
    const columnas = aColumnas({ includes: [], ...datos })
    columnas.categoria = await categoriaExistente(conn, datos.category)
    const [r] = await conn.query<ResultSetHeader>("INSERT INTO servicios SET ?", [columnas])
    return r.insertId
  })
  res.status(201).json(await buscarServicio(id))
})

/** PATCH /api/admin/servicios/:id — también sirve para pausar: { "activo": false }. */
adminServicios.patch("/servicios/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const datos = cambiosServicio.parse(req.body)
  await enTransaccion(async (conn) => {
    const columnas = aColumnas(datos)
    if (datos.category !== undefined) columnas.categoria = await categoriaExistente(conn, datos.category, id)
    if (!Object.keys(columnas).length) return
    const [r] = await conn.query<ResultSetHeader>("UPDATE servicios SET ? WHERE id = ?", [columnas, id])
    if (r.affectedRows === 0) throw noEncontrado("Servicio")
  })
  res.json(await buscarServicio(id))
})
