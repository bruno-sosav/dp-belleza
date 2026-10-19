/**
 * Panel: recordatorios por WhatsApp.
 *
 * La dueña define TIPOS de recordatorio (tabla `tipos_recordatorio`), cada uno
 * con un momento:
 *   antes       X horas antes de un turno pedido ("confirmame que venís")
 *   despues     X días después de una visita completada ("¿renovamos?"),
 *               opcionalmente solo para un servicio
 *   cumpleanos  X días antes del cumpleaños de la clienta (0 = ese día)
 *
 * A quién le toca cada uno se calcula en el momento, y `recordatorios` guarda
 * lo que ya se mandó u omitió: por turno (antes/después) o por clienta y año
 * (cumpleaños).
 *
 * No hay un proceso que los mande solo (eso necesita un proveedor pago de
 * WhatsApp): el panel abre WhatsApp con el mensaje escrito y la dueña lo envía.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { pool } from "../shared/db.js"
import { malaPeticion, noEncontrado } from "../shared/errors.js"
import { leerConfigs } from "../shared/configuracion.js"
import { armarMensaje, avisoQueToca, proximoCumple, VENTANA_DESPUES_DIAS } from "../turnera/recordatorios.js"
import { aDateTime, fechaLarga, hoy, minutosAhora, sumarDias } from "../turnera/tiempo.js"

export const adminRecordatorios = Router()

const idParam = z.coerce.number().int().positive()

type Momento = "antes" | "despues" | "cumpleanos"

type Tipo = {
  id: number
  nombre: string
  momento: Momento
  /** Solo "antes". */
  horasAntes: number | null
  /** "despues": días después de la visita. "cumpleanos": días antes del cumpleaños. */
  dias: number | null
  /** Solo "despues", opcional: el recordatorio es solo para ese servicio. */
  servicio: { id: number; nombre: string } | null
  mensaje: string
}

const SELECT_TIPO = `
  SELECT tr.*, s.nombre AS servicio_nombre
    FROM tipos_recordatorio tr
    LEFT JOIN servicios s ON s.id = tr.servicio_id`

function aTipo(r: RowDataPacket): Tipo {
  return {
    id: r.id,
    nombre: r.nombre,
    momento: r.momento,
    horasAntes: r.horas_antes,
    dias: r.dias,
    servicio: r.servicio_id ? { id: r.servicio_id, nombre: r.servicio_nombre } : null,
    mensaje: r.mensaje,
  }
}

/** Orden en que se muestran: antes del turno (del más temprano al más cercano), después, cumpleaños. */
async function listarTipos(): Promise<Tipo[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TIPO} WHERE tr.activo = 1
      ORDER BY FIELD(tr.momento, 'antes', 'despues', 'cumpleanos'), tr.horas_antes DESC, tr.dias, tr.id`,
  )
  return rows.map(aTipo)
}

/** "2026-10-20 14:30:00" -> Date local. Las dos puntas de la cuenta se arman igual, así la zona horaria se cancela. */
function aFecha(dt: string) {
  const [f, h = "00:00"] = dt.split(" ")
  const [y, m, d] = f.split("-").map(Number)
  const [hh, mm] = h.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

type Cliente = { id: number; nombre: string; apellido: string | null; telefono: string }
const aCliente = (r: RowDataPacket): Cliente => ({
  id: r.cliente_id,
  nombre: r.nombre,
  apellido: r.apellido,
  telefono: r.telefono,
})

/**
 * Un aviso para mandar. `registro` es lo que el panel manda de vuelta al
 * marcarlo (POST /recordatorios): identifica el aviso sin que el panel tenga
 * que saber cómo se guarda cada momento.
 */
type Aviso = {
  momento: Momento
  tipo: { id: number; nombre: string }
  cliente: Cliente
  /** Antes: el turno que viene. Después: la visita que pasó. Cumpleaños: null. */
  turno: { id: number; fecha: string; hora: string; servicio: string } | null
  /** Solo cumpleaños: día, mes y cuántos días faltan (0 = hoy). */
  cumple: { dia: number; mes: number; faltan: number } | null
  mensaje: string
  registro: { tipoId: number; turnoId?: number; clienteId?: number; anio?: number }
}

const SELECT_TURNO = `
  SELECT t.id, t.fecha_hora_inicio, t.servicio_id, s.nombre AS servicio,
         c.id AS cliente_id, c.nombre, c.apellido, c.telefono
    FROM turnos t
    JOIN servicios s ON s.id = t.servicio_id
    JOIN clientes c  ON c.id = t.cliente_id`

function turnoDe(r: RowDataPacket) {
  const inicio = String(r.fecha_hora_inicio)
  return { id: r.id as number, fecha: inicio.slice(0, 10), hora: inicio.slice(11, 16), servicio: r.servicio as string }
}

/** Antes del turno: turnos pedidos dentro de la ventana del tipo más largo. */
async function avisosAntes(tipos: Tipo[], negocio: string, ahora: string): Promise<Aviso[]> {
  const deAntes = tipos.filter((t) => t.momento === "antes" && t.horasAntes)
  if (!deAntes.length) return []
  const maxHoras = Math.max(...deAntes.map((t) => t.horasAntes!))

  const [turnos] = await pool.query<RowDataPacket[]>(
    `${SELECT_TURNO}
      WHERE t.estado IN ('reservado', 'confirmado')
        -- Con la seña sin pagar todavía no es un turno firme: puede liberarse
        -- en minutos. Se recuerda recién cuando la pague.
        AND (t.sena_estado IS NULL OR t.sena_estado = 'pagada')
        AND t.fecha_hora_inicio > ?
        AND t.fecha_hora_inicio <= DATE_ADD(?, INTERVAL ? HOUR)
      ORDER BY t.fecha_hora_inicio`,
    [ahora, ahora, maxHoras],
  )
  const [hechos] = turnos.length
    ? await pool.query<RowDataPacket[]>("SELECT turno_id, tipo_id FROM recordatorios WHERE turno_id IN (?)", [turnos.map((t) => t.id)])
    : [[] as RowDataPacket[]]

  return turnos.flatMap((r) => {
    const horas = (aFecha(String(r.fecha_hora_inicio)).getTime() - aFecha(ahora).getTime()) / 3_600_000
    const hechosDelTurno = hechos.filter((h) => h.turno_id === r.id).map((h) => h.tipo_id as number)
    const elegido = avisoQueToca(
      horas,
      deAntes.map((t) => ({ id: t.id, horasAntes: t.horasAntes! })),
      hechosDelTurno,
    )
    const tipo = elegido && deAntes.find((t) => t.id === elegido.id)
    if (!tipo) return []
    const turno = turnoDe(r)
    return [
      {
        momento: "antes" as const,
        tipo: { id: tipo.id, nombre: tipo.nombre },
        cliente: aCliente(r),
        turno,
        cumple: null,
        mensaje: armarMensaje(tipo.mensaje, { nombre: r.nombre, servicio: turno.servicio, fecha: fechaLarga(turno.fecha), hora: turno.hora, negocio }),
        registro: { tipoId: tipo.id, turnoId: turno.id },
      },
    ]
  })
}

/**
 * Después de la visita: por cada tipo, la ÚLTIMA visita completada de cada
 * clienta (de ese servicio, si el tipo lo filtra) que cumplió los días hace
 * menos de VENTANA_DESPUES_DIAS. No aparece si la clienta ya tiene otro turno
 * pedido: ya volvió, no hay nada que recordarle.
 */
async function avisosDespues(tipos: Tipo[], negocio: string, ahora: string): Promise<Aviso[]> {
  const avisos: Aviso[] = []
  for (const tipo of tipos.filter((t) => t.momento === "despues" && t.dias)) {
    // El filtro de servicio va dos veces: en la visita y en "su última visita".
    const porServicio = tipo.servicio ? [tipo.servicio.id, tipo.servicio.id] : []
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_TURNO}
        WHERE t.estado = 'completado'
          ${tipo.servicio ? "AND t.servicio_id = ?" : ""}
          -- la última visita de la clienta (de ese servicio, si filtra)
          AND t.fecha_hora_inicio = (
                SELECT MAX(t2.fecha_hora_inicio) FROM turnos t2
                 WHERE t2.cliente_id = t.cliente_id AND t2.estado = 'completado'
                   ${tipo.servicio ? "AND t2.servicio_id = ?" : ""})
          AND DATE(t.fecha_hora_inicio) <= DATE_SUB(?, INTERVAL ? DAY)
          AND DATE(t.fecha_hora_inicio) >  DATE_SUB(?, INTERVAL ? DAY)
          -- sin otro turno pedido
          AND NOT EXISTS (SELECT 1 FROM turnos t3
                           WHERE t3.cliente_id = t.cliente_id
                             AND t3.estado IN ('reservado', 'confirmado')
                             AND t3.fecha_hora_inicio > ?)
          AND NOT EXISTS (SELECT 1 FROM recordatorios r WHERE r.turno_id = t.id AND r.tipo_id = ?)
        ORDER BY t.fecha_hora_inicio`,
      [
        ...porServicio,
        hoy(),
        tipo.dias,
        hoy(),
        tipo.dias! + VENTANA_DESPUES_DIAS,
        ahora,
        tipo.id,
      ],
    )
    for (const r of rows) {
      const turno = turnoDe(r)
      avisos.push({
        momento: "despues",
        tipo: { id: tipo.id, nombre: tipo.nombre },
        cliente: aCliente(r),
        turno,
        cumple: null,
        mensaje: armarMensaje(tipo.mensaje, { nombre: r.nombre, servicio: turno.servicio, fecha: fechaLarga(turno.fecha), hora: turno.hora, negocio }),
        registro: { tipoId: tipo.id, turnoId: turno.id },
      })
    }
  }
  return avisos
}

/** Cumpleaños: clientas a las que les faltan `dias` o menos para el cumpleaños. */
async function avisosCumple(tipos: Tipo[], negocio: string): Promise<Aviso[]> {
  const deCumple = tipos.filter((t) => t.momento === "cumpleanos" && t.dias !== null)
  if (!deCumple.length) return []

  const [clientes] = await pool.query<RowDataPacket[]>(
    "SELECT id AS cliente_id, nombre, apellido, telefono, cumple_dia, cumple_mes FROM clientes WHERE cumple_dia IS NOT NULL",
  )
  const [hechos] = await pool.query<RowDataPacket[]>(
    "SELECT tipo_id, cliente_id, anio FROM recordatorios WHERE cliente_id IS NOT NULL AND tipo_id IN (?)",
    [deCumple.map((t) => t.id)],
  )

  const avisos: Aviso[] = []
  for (const c of clientes) {
    const { dias: faltan, anio } = proximoCumple(hoy(), c.cumple_dia, c.cumple_mes)
    // Si hay varios tipos de cumpleaños (una promo una semana antes y un
    // saludo ese día), aparece el más cercano que no se hizo, como en "antes".
    const tipo = deCumple
      .filter((t) => faltan <= t.dias! && !hechos.some((h) => h.tipo_id === t.id && h.cliente_id === c.cliente_id && h.anio === anio))
      .sort((a, b) => a.dias! - b.dias!)[0]
    if (!tipo) continue
    const fecha = sumarDias(hoy(), faltan)
    avisos.push({
      momento: "cumpleanos",
      tipo: { id: tipo.id, nombre: tipo.nombre },
      cliente: aCliente(c),
      turno: null,
      cumple: { dia: c.cumple_dia, mes: c.cumple_mes, faltan },
      mensaje: armarMensaje(tipo.mensaje, { nombre: c.nombre, servicio: "", fecha: fechaLarga(fecha), hora: "", negocio }),
      registro: { tipoId: tipo.id, clienteId: c.cliente_id, anio },
    })
  }
  return avisos.sort((a, b) => a.cumple!.faltan - b.cumple!.faltan)
}

/**
 * GET /api/admin/recordatorios
 *
 *   paraMandar  lo que hoy hay que mandar, con el mensaje ya armado, agrupable
 *               por `tipo`. Primero los de antes del turno, después los de
 *               después de la visita y al final los cumpleaños.
 *   hechosHoy   lo que se mandó u omitió hoy, para poder deshacer.
 */
adminRecordatorios.get("/recordatorios", async (_req, res) => {
  const tipos = await listarTipos()
  const { nombre_negocio: negocio = "" } = await leerConfigs(["nombre_negocio"])
  const ahora = aDateTime(hoy(), minutosAhora())

  const paraMandar = [
    ...(await avisosAntes(tipos, negocio, ahora)),
    ...(await avisosDespues(tipos, negocio, ahora)),
    ...(await avisosCumple(tipos, negocio)),
  ]

  const [deHoy] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.estado, tr.nombre AS tipo, tr.momento,
            COALESCE(ct.nombre, cc.nombre) AS nombre, COALESCE(ct.apellido, cc.apellido) AS apellido
       FROM recordatorios r
       JOIN tipos_recordatorio tr ON tr.id = r.tipo_id
       LEFT JOIN turnos t   ON t.id = r.turno_id
       LEFT JOIN clientes ct ON ct.id = t.cliente_id
       LEFT JOIN clientes cc ON cc.id = r.cliente_id
      WHERE r.enviado_at >= ?
      ORDER BY r.enviado_at DESC`,
    [hoy()],
  )
  const hechosHoy = deHoy.map((r) => ({
    id: r.id as number,
    estado: r.estado as "enviado" | "omitido",
    tipo: r.tipo as string,
    cliente: { nombre: r.nombre as string, apellido: r.apellido as string | null },
  }))

  res.json({ paraMandar, hechosHoy })
})

/**
 * POST /api/admin/recordatorios
 *   { "tipoId": 1, "turnoId": 12, "estado": "enviado" }                 antes / después
 *   { "tipoId": 3, "clienteId": 4, "anio": 2026, "estado": "omitido" }   cumpleaños
 *
 * El cuerpo es el `registro` que vino en el aviso, más el estado.
 */
adminRecordatorios.post("/recordatorios", async (req, res) => {
  const d = z
    .object({
      tipoId: z.number().int().positive(),
      turnoId: z.number().int().positive().optional(),
      clienteId: z.number().int().positive().optional(),
      anio: z.number().int().min(2000).max(2100).optional(),
      estado: z.enum(["enviado", "omitido"]),
    })
    .parse(req.body)
  const porTurno = d.turnoId !== undefined
  if (porTurno === (d.clienteId !== undefined && d.anio !== undefined)) {
    throw malaPeticion("Tiene que venir turnoId, o clienteId y anio.")
  }
  const [r] = await pool.query<ResultSetHeader>(
    `INSERT INTO recordatorios (tipo_id, turno_id, cliente_id, anio, estado, enviado_at, intentos)
     VALUES (?, ?, ?, ?, ?, NOW(), 1)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), enviado_at = NOW(), intentos = intentos + 1`,
    [d.tipoId, d.turnoId ?? null, porTurno ? null : d.clienteId, porTurno ? null : d.anio, d.estado],
  )
  res.status(201).json({ id: r.insertId })
})

/** DELETE /api/admin/recordatorios/:id — deshacer: el aviso vuelve a "para mandar". */
adminRecordatorios.delete("/recordatorios/:id", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM recordatorios WHERE id = ?", [idParam.parse(req.params.id)])
  if (r.affectedRows === 0) throw noEncontrado("Recordatorio")
  res.status(204).end()
})

// ---------------------------------------------------------------- tipos

const comunes = {
  nombre: z.string().trim().min(1).max(100),
  mensaje: z.string().trim().min(10).max(1000),
}
const datosTipo = z.discriminatedUnion("momento", [
  // Hasta una semana antes: más que eso ya no es un recordatorio del turno.
  z.object({ momento: z.literal("antes"), horasAntes: z.number().int().min(1).max(168), ...comunes }),
  z.object({
    momento: z.literal("despues"),
    dias: z.number().int().min(1).max(365),
    servicioId: z.number().int().positive().nullable().default(null),
    ...comunes,
  }),
  z.object({ momento: z.literal("cumpleanos"), dias: z.number().int().min(0).max(30), ...comunes }),
])

function aColumnas(d: z.infer<typeof datosTipo>) {
  return {
    nombre: d.nombre,
    momento: d.momento,
    mensaje: d.mensaje,
    horas_antes: d.momento === "antes" ? d.horasAntes : null,
    dias: d.momento === "antes" ? null : d.dias,
    servicio_id: d.momento === "despues" ? d.servicioId : null,
  }
}

async function buscarTipo(id: number): Promise<Tipo> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_TIPO} WHERE tr.id = ? AND tr.activo = 1`, [id])
  if (!rows[0]) throw noEncontrado("Tipo de recordatorio")
  return aTipo(rows[0])
}

/** GET /api/admin/recordatorios/tipos */
adminRecordatorios.get("/recordatorios/tipos", async (_req, res) => {
  res.json(await listarTipos())
})

adminRecordatorios.post("/recordatorios/tipos", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("INSERT INTO tipos_recordatorio SET ?", [aColumnas(datosTipo.parse(req.body))])
  res.status(201).json(await buscarTipo(r.insertId))
})

/** PATCH /api/admin/recordatorios/tipos/:id — reemplaza el tipo entero (el formulario manda todo). */
adminRecordatorios.patch("/recordatorios/tipos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id)
  const [r] = await pool.query<ResultSetHeader>("UPDATE tipos_recordatorio SET ? WHERE id = ? AND activo = 1", [
    aColumnas(datosTipo.parse(req.body)),
    id,
  ])
  if (r.affectedRows === 0) throw noEncontrado("Tipo de recordatorio")
  res.json(await buscarTipo(id))
})

/**
 * DELETE /api/admin/recordatorios/tipos/:id
 *
 * Se desactiva en vez de borrarse, así el registro de lo ya mandado no se
 * pierde. Para la dueña es lo mismo: deja de existir.
 */
adminRecordatorios.delete("/recordatorios/tipos/:id", async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>("UPDATE tipos_recordatorio SET activo = 0 WHERE id = ? AND activo = 1", [
    idParam.parse(req.params.id),
  ])
  if (r.affectedRows === 0) throw noEncontrado("Tipo de recordatorio")
  res.status(204).end()
})
