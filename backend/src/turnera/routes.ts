import { Router } from "express"
import { z } from "zod"
import * as service from "./service.js"
import type { RowDataPacket } from "mysql2"
import { consultaDisponibilidad, nuevoTurno } from "./validacion.js"
import { pool } from "../core/database/conexion.js"
import { HttpError } from "../core/errores.js"
import { limitarPorIp } from "../core/http/limitarPorIp.js"

// Cuántas reservas puede HACER una misma conexión por hora. Solo cuentan las
// que salen bien: equivocarse de horario no gasta intentos. Junto con el tope
// por teléfono (reglasReserva.ts), evita que alguien llene la agenda.
const limiteReservas = limitarPorIp({
  maximo: 6,
  ventanaMs: 60 * 60_000,
  soloExitosos: true,
  mensaje: "Hiciste muchas reservas seguidas. Si necesitás más turnos, escribinos por WhatsApp.",
})

// Rutas de la turnera, montadas en /api/turnos. Las rutas no tienen lógica:
// validan la entrada, llaman al service y devuelven. Así el service se puede
// probar sin levantar un servidor.
export const turnos = Router()

// Agenda semanal del local. El front la usa para saber qué días deshabilitar en
// el calendario: los días que no aparecen están cerrados.
turnos.get("/horarios", async (_req, res) => {
  res.json(await service.listarHorarios())
})

// Horarios libres para un servicio en un día. Si el local no atiende, va vacío.
turnos.get("/disponibilidad", async (req, res) => {
  const { servicioId, fecha } = consultaDisponibilidad.parse(req.query)
  res.json(await service.calcularDisponibilidad(servicioId, fecha, 0, { reglasWeb: true }))
})

// Reserva. El cliente no tiene cuenta: se identifica por teléfono.
turnos.post("/", limiteReservas, async (req, res) => {
  const turno = await service.crearTurno(nuevoTurno.parse(req.body))
  res.status(201).json(turno)
})

/**
 * GET /api/turnos/reserva/:token — la confirmación de una reserva, para que la
 * pantalla "¡Turno reservado!" sobreviva a un F5. El token es aleatorio y solo
 * lo tiene quien reservó (viaja en la URL de esa pantalla).
 */
turnos.get("/reserva/:token", async (req, res) => {
  const token = z.string().regex(/^[0-9a-f]{32}$/).parse(req.params.token)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.estado, t.fecha_hora_inicio, t.fecha_hora_fin, t.precio, t.notas,
            s.id AS servicio_id, s.nombre AS servicio, s.duracion_min, s.profesional,
            c.nombre, c.apellido, c.telefono, c.email
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
       JOIN clientes c  ON c.id = t.cliente_id
      WHERE t.token_publico = ?`,
    [token],
  )
  const r = rows[0]
  if (!r) throw new HttpError(404, "No encontramos esa reserva.")
  const inicio = String(r.fecha_hora_inicio)
  res.json({
    id: r.id,
    estado: r.estado,
    fecha: inicio.slice(0, 10),
    horaInicio: inicio.slice(11, 16),
    horaFin: String(r.fecha_hora_fin).slice(11, 16),
    precio: Number(r.precio),
    notas: r.notas,
    servicio: { id: r.servicio_id, nombre: r.servicio, duracionMin: r.duracion_min, profesional: r.profesional },
    cliente: { nombre: [r.nombre, r.apellido].filter(Boolean).join(" "), telefono: r.telefono, email: r.email },
  })
})
