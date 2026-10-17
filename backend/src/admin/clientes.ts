/**
 * Panel: clientas.
 *
 * `clientes` es la tabla COMPARTIDA entre turnera y tienda (ver
 * backend/README.md): la misma persona que reserva un turno y compra un
 * producto es una sola fila, identificada por teléfono. Por eso la ficha junta
 * los dos historiales.
 *
 * De la tienda solo se LEE `pedidos` (para el historial y el total gastado). La
 * gestión de pedidos es del módulo de ecommerce, en admin/tienda.ts.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../shared/db.js"
import { conflicto, malaPeticion, noEncontrado } from "../shared/errors.js"
import { normalizarTelefono } from "../shared/models/telefono.js"
import type { EstadoTurno } from "../turnera/estados.js"

export const adminClientes = Router()

const idParam = z.coerce.number().int().positive()

/**
 * Resumen de cada clienta, calculado en SQL: dos subconsultas agregadas (una por
 * módulo) unidas a `clientes`. Así la lista no hace un pedido por fila.
 *
 * Plata: solo turnos `completado` y pedidos que no estén `cancelado`.
 */
const SELECT_CLIENTE = `
  SELECT c.id, c.nombre, c.apellido, c.telefono, c.email, c.cumple_dia, c.cumple_mes, c.notas, c.created_at,
         COALESCE(t.visitas, 0)        AS visitas,
         COALESCE(t.ausencias, 0)      AS ausencias,
         COALESCE(t.gastado, 0)        AS gastado_turnos,
         t.ultima_visita,
         t.proximo_turno,
         COALESCE(p.compras, 0)        AS compras,
         COALESCE(p.gastado, 0)        AS gastado_tienda
    FROM clientes c
    LEFT JOIN (
        SELECT cliente_id,
               SUM(estado = 'completado')                                     AS visitas,
               SUM(estado = 'ausente')                                        AS ausencias,
               SUM(CASE WHEN estado = 'completado' THEN precio ELSE 0 END)    AS gastado,
               MAX(CASE WHEN estado = 'completado' THEN fecha_hora_inicio END) AS ultima_visita,
               MIN(CASE WHEN estado IN ('reservado', 'confirmado') AND fecha_hora_inicio > NOW()
                        THEN fecha_hora_inicio END)                           AS proximo_turno
          FROM turnos
         GROUP BY cliente_id
    ) t ON t.cliente_id = c.id
    LEFT JOIN (
        SELECT cliente_id, COUNT(*) AS compras, SUM(total) AS gastado
          FROM pedidos
         WHERE estado <> 'cancelado'
         GROUP BY cliente_id
    ) p ON p.cliente_id = c.id`

function aCliente(r: RowDataPacket) {
  const gastadoTurnos = Number(r.gastado_turnos)
  const gastadoTienda = Number(r.gastado_tienda)
  return {
    id: r.id as number,
    nombre: r.nombre as string,
    apellido: r.apellido as string | null,
    telefono: r.telefono as string,
    email: r.email as string | null,
    /** Solo día y mes. null si no se cargó. */
    cumple: r.cumple_dia ? { dia: r.cumple_dia as number, mes: r.cumple_mes as number } : null,
    notas: r.notas as string | null,
    clienteDesde: String(r.created_at).slice(0, 10),
    visitas: Number(r.visitas),
    ausencias: Number(r.ausencias),
    compras: Number(r.compras),
    gastado: { turnos: gastadoTurnos, tienda: gastadoTienda, total: gastadoTurnos + gastadoTienda },
    /** "2026-10-15", o null si nunca vino. */
    ultimaVisita: r.ultima_visita ? String(r.ultima_visita).slice(0, 10) : null,
    /** "2026-10-20 14:30", o null si no tiene turnos pedidos. */
    proximoTurno: r.proximo_turno ? String(r.proximo_turno).slice(0, 16) : null,
  }
}

async function buscarCliente(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_CLIENTE} WHERE c.id = ?`, [id])
  if (!rows[0]) throw noEncontrado("Cliente")
  return aCliente(rows[0])
}

/**
 * GET /api/admin/clientes?q=ana
 *
 * Busca por nombre, apellido o teléfono. El teléfono se compara solo por
 * dígitos, así "223 555" encuentra "5492235550001".
 */
adminClientes.get("/clientes", async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).optional() }).parse(req.query)

  const condiciones: string[] = []
  const params: unknown[] = []
  if (q) {
    const palabras = q.split(/\s+/)
    // Cada palabra tiene que aparecer en algún campo: "ana pe" encuentra "Ana Pérez".
    for (const palabra of palabras) {
      const digitos = palabra.replace(/\D/g, "")
      const campos = ["c.nombre LIKE ?", "c.apellido LIKE ?"]
      params.push(`%${palabra}%`, `%${palabra}%`)
      if (digitos.length >= 3) {
        campos.push("c.telefono LIKE ?")
        params.push(`%${digitos}%`)
      }
      condiciones.push(`(${campos.join(" OR ")})`)
    }
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_CLIENTE} ${where} ORDER BY c.nombre, c.apellido LIMIT 500`,
    params,
  )
  res.json(rows.map(aCliente))
})

/** GET /api/admin/clientes/:id — la ficha: datos, resumen y los dos historiales. */
adminClientes.get("/clientes/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const cliente = await buscarCliente(id)

  const [turnos] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.estado, t.precio, t.notas, t.fecha_hora_inicio, t.fecha_hora_fin, s.nombre AS servicio
       FROM turnos t JOIN servicios s ON s.id = t.servicio_id
      WHERE t.cliente_id = ?
      ORDER BY t.fecha_hora_inicio DESC
      LIMIT 200`,
    [id],
  )
  const [pedidos] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.estado, p.total, p.created_at,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
       FROM pedidos p
      WHERE p.cliente_id = ?
      ORDER BY p.created_at DESC
      LIMIT 200`,
    [id],
  )

  res.json({
    ...cliente,
    turnos: turnos.map((t) => ({
      id: t.id as number,
      estado: t.estado as EstadoTurno,
      fecha: String(t.fecha_hora_inicio).slice(0, 10),
      horaInicio: String(t.fecha_hora_inicio).slice(11, 16),
      horaFin: String(t.fecha_hora_fin).slice(11, 16),
      servicio: t.servicio as string,
      precio: t.precio as number,
      notas: t.notas as string | null,
    })),
    pedidos: pedidos.map((p) => ({
      id: p.id as number,
      estado: p.estado as string,
      total: p.total as number,
      unidades: Number(p.unidades),
      fecha: String(p.created_at).slice(0, 10),
    })),
  })
})

const datosCliente = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido: z.string().trim().max(100).nullable(),
  telefono: z.string().trim().min(6).max(30),
  email: z.email().max(150).nullable(),
  // Notas internas de la dueña: la clienta no las ve.
  notas: z.string().trim().max(2000).nullable(),
  // Solo día y mes (el año no hace falta para saludarla). null = no se sabe.
  cumple: z
    .object({ dia: z.number().int().min(1).max(31), mes: z.number().int().min(1).max(12) })
    .refine(({ dia, mes }) => dia <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1], "Ese día no existe en ese mes")
    .nullable(),
})
const nuevaCliente = datosCliente.partial().required({ nombre: true, telefono: true })
const cambiosCliente = datosCliente.partial()

/** Pasa los datos validados a columnas de la tabla. El teléfono se normaliza igual que al reservar o comprar. */
function aColumnas(datos: z.infer<typeof cambiosCliente>) {
  const columnas: Record<string, unknown> = {}
  if (datos.nombre !== undefined) columnas.nombre = datos.nombre
  if (datos.apellido !== undefined) columnas.apellido = datos.apellido || null
  if (datos.email !== undefined) columnas.email = datos.email || null
  if (datos.notas !== undefined) columnas.notas = datos.notas || null
  if (datos.cumple !== undefined) {
    columnas.cumple_dia = datos.cumple?.dia ?? null
    columnas.cumple_mes = datos.cumple?.mes ?? null
  }
  if (datos.telefono !== undefined) {
    const telefono = normalizarTelefono(datos.telefono)
    if (!telefono) throw malaPeticion("El teléfono no es válido")
    columnas.telefono = telefono
  }
  return columnas
}

/**
 * Corre un INSERT/UPDATE sobre `clientes` traduciendo el choque con
 * `uq_clientes_telefono` a un mensaje que la dueña entienda.
 */
async function escribirCliente(sql: string, params: unknown[]) {
  try {
    const [r] = await pool.query<ResultSetHeader>(sql, params)
    return r
  } catch (err) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      throw conflicto("Ese teléfono ya lo tiene otra clienta.")
    }
    throw err
  }
}

/**
 * POST /api/admin/clientes
 *
 * Alta manual, para las clientas que llegan por teléfono o en persona. Las que
 * reservan por la web o compran en la tienda se crean solas (buscarOCrearCliente).
 */
adminClientes.post("/clientes", async (req, res) => {
  const columnas = aColumnas(nuevaCliente.parse(req.body))
  const r = await escribirCliente("INSERT INTO clientes SET ?", [columnas])
  res.status(201).json(await buscarCliente(r.insertId))
})

/**
 * PATCH /api/admin/clientes/:id
 *
 * Unir dos fichas duplicadas es otra operación, todavía no existe.
 */
adminClientes.patch("/clientes/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const columnas = aColumnas(cambiosCliente.parse(req.body))
  if (Object.keys(columnas).length) {
    const r = await escribirCliente("UPDATE clientes SET ? WHERE id = ?", [columnas, id])
    if (r.affectedRows === 0) throw noEncontrado("Cliente")
  }
  res.json(await buscarCliente(id))
})

/**
 * DELETE /api/admin/clientes/:id
 *
 * Solo se puede borrar una clienta SIN historial (por ejemplo, cargada por
 * error). Si tiene turnos o pedidos, borrarla haría desaparecer esa plata de
 * Finanzas y los pedidos de la tienda quedarían sin dueña; las FK de `turnos` y
 * `pedidos` igual lo impedirían. Se responde 409 con el motivo.
 */
adminClientes.delete("/clientes/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const cliente = await buscarCliente(id)

  const [[uso]] = await pool.query<RowDataPacket[]>(
    `SELECT (SELECT COUNT(*) FROM turnos  WHERE cliente_id = ?) AS turnos,
            (SELECT COUNT(*) FROM pedidos WHERE cliente_id = ?) AS pedidos`,
    [id, id],
  )
  const turnos = Number(uso.turnos)
  const pedidos = Number(uso.pedidos)
  if (turnos || pedidos) {
    const partes = [
      turnos && `${turnos} ${turnos === 1 ? "turno" : "turnos"}`,
      pedidos && `${pedidos} ${pedidos === 1 ? "compra" : "compras"}`,
    ].filter(Boolean)
    throw conflicto(
      `No se puede eliminar a ${cliente.nombre}: tiene ${partes.join(" y ")} registrados. ` +
        "Si se borrara, esa plata desaparecería de Finanzas.",
    )
  }

  await pool.query("DELETE FROM clientes WHERE id = ?", [id])
  res.status(204).end()
})
