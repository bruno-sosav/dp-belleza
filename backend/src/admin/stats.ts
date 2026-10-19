/**
 * Estadísticas del panel.
 *
 * Los números se calculan en SQL con GROUP BY, no en el navegador. Antes el
 * panel generaba 180 días de pedidos y turnos falsos en el cliente y sacaba los
 * promedios ahí; eso no escala y pone la lógica de negocio en el browser.
 *
 * Lo que SÍ sigue en el frontend son las cuentas de presentación sobre la serie
 * diaria ya agregada (días más movidos, puesto del día, promedios por día de la
 * semana): son 180 puntos, no miles de filas.
 *
 * OJO con los días de la semana — en este proyecto hay tres convenciones:
 *
 *   horarios_atencion.dia_semana   ISO 8601:  1 = lunes  ... 7 = domingo
 *   DayStats.weekday (frontend)    JavaScript: 0 = domingo ... 6 = sábado
 *   MySQL DAYOFWEEK()              1 = domingo ... 7 = sábado
 *
 * Acá se devuelve la de JavaScript, que es la que esperan los charts:
 * `DAYOFWEEK(fecha) - 1`.
 *
 * NOTA: este archivo solo agrega lo de la TURNERA. Los campos de la tienda
 * (`shop`, `orderCount`) van en 0 y la respuesta avisa con `tiendaConectada:
 * false`, para que el panel muestre "pendiente" en vez de un $0 que sería
 * mentira. Las queries que faltan están marcadas con TODO más abajo.
 */
import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"
import { pool } from "../core/database/conexion.js"
import { hoy } from "../core/tiempo.js"

export const adminStats = Router()

/** Misma forma que `DayStats` en frontend/admin/src/lib/stats.ts. */
type DiaStats = {
  date: string
  weekday: number
  shop: number
  services: number
  total: number
  orderCount: number
  bookingCount: number
  cancelledCount: number
  /** Turnos en estado `ausente`: la clienta no vino sin avisar. */
  noShowCount: number
}

const consultaDias = z.object({
  dias: z.coerce.number().int().min(1).max(400).default(180),
})

const consultaPeriodo = z.object({
  dias: z.coerce.number().int().min(1).max(400).default(30),
})

const consultaFecha = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que venir como YYYY-MM-DD"),
})

/**
 * Rango [desde, hasta) de los últimos `dias` días, terminando hoy inclusive.
 * `hasta` es mañana para que los turnos de hoy entren completos sin tener que
 * comparar horas.
 */
function rango(dias: number): { desde: string; hasta: string } {
  const [y, m, d] = hoy().split("-").map(Number)
  const desde = new Date(y, m - 1, d - dias + 1)
  const hasta = new Date(y, m - 1, d + 1)
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
  return { desde: fmt(desde), hasta: fmt(hasta) }
}

/** Todos los días del rango, incluidos los que no tuvieron movimiento. */
function diasVacios(dias: number): Map<string, DiaStats> {
  const mapa = new Map<string, DiaStats>()
  const [y, m, d] = hoy().split("-").map(Number)
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = new Date(y, m - 1, d - i)
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
    mapa.set(clave, {
      date: clave,
      weekday: fecha.getDay(),
      shop: 0,
      services: 0,
      total: 0,
      orderCount: 0,
      bookingCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
    })
  }
  return mapa
}

/**
 * GET /api/admin/stats/dias?dias=180
 *
 * Serie diaria. Se piden 180 días de una vez y el panel va cortando según el
 * filtro de período (7/30/90) y su período anterior, así cambiar de filtro no
 * dispara otro pedido.
 *
 * Los días sin movimiento vienen en 0: los gráficos necesitan la serie completa,
 * si no un día sin turnos desaparecería del eje en vez de mostrarse vacío.
 */
adminStats.get("/stats/dias", async (req, res) => {
  const { dias } = consultaDias.parse(req.query)
  const { desde, hasta } = rango(dias)

  const [filas] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(fecha_hora_inicio)                                      AS fecha,
            SUM(CASE WHEN estado = 'completado' THEN precio ELSE 0 END)  AS ganancia,
            SUM(estado = 'completado')                                   AS realizados,
            SUM(estado = 'cancelado')                                    AS cancelados,
            SUM(estado = 'ausente')                                      AS ausentes
       FROM turnos
      WHERE fecha_hora_inicio >= ? AND fecha_hora_inicio < ?
      GROUP BY fecha`,
    [desde, hasta],
  )

  const mapa = diasVacios(dias)
  for (const f of filas) {
    const dia = mapa.get(String(f.fecha))
    if (!dia) continue
    dia.services = Number(f.ganancia)
    dia.bookingCount = Number(f.realizados)
    dia.cancelledCount = Number(f.cancelados)
    dia.noShowCount = Number(f.ausentes)
    dia.total = dia.shop + dia.services
  }

  // TODO (equipo de ecommerce): sumar acá la plata de la tienda.
  //
  //   SELECT DATE(created_at) AS fecha, SUM(total) AS ganancia, COUNT(*) AS pedidos
  //     FROM pedidos
  //    WHERE estado <> 'cancelado' AND created_at >= ? AND created_at < ?
  //    GROUP BY fecha
  //
  // y volcarlo en dia.shop / dia.orderCount, recalculando dia.total.
  // Al hacerlo, cambiar `tiendaConectada` a true.

  res.json({ dias: [...mapa.values()], tiendaConectada: false })
})

/**
 * GET /api/admin/stats/servicios?dias=30
 * Servicios más reservados del período. Solo turnos completados: un turno
 * cancelado no es un servicio prestado.
 */
adminStats.get("/stats/servicios", async (req, res) => {
  const { dias } = consultaPeriodo.parse(req.query)
  const { desde, hasta } = rango(dias)

  const [filas] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.nombre AS name, COUNT(*) AS count, SUM(t.precio) AS revenue
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
      WHERE t.estado = 'completado'
        AND t.fecha_hora_inicio >= ? AND t.fecha_hora_inicio < ?
      GROUP BY s.id, s.nombre
      ORDER BY count DESC, revenue DESC`,
    [desde, hasta],
  )
  res.json(filas)
})

/**
 * GET /api/admin/stats/servicios-del-dia?fecha=2026-10-19
 * Qué se hizo un día puntual. Lo usa el detalle que se abre al tocar un día del
 * calendario.
 */
adminStats.get("/stats/servicios-del-dia", async (req, res) => {
  const { fecha } = consultaFecha.parse(req.query)
  const [filas] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.nombre AS name, COUNT(*) AS count, SUM(t.precio) AS revenue
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
      WHERE t.estado = 'completado' AND DATE(t.fecha_hora_inicio) = ?
      GROUP BY s.id, s.nombre
      ORDER BY count DESC, revenue DESC`,
    [fecha],
  )
  res.json(filas)
})
