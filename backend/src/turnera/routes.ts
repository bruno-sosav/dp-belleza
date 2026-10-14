import { Router } from "express"
import { z } from "zod"
import * as service from "./service.js"
import { consultaDisponibilidad, nuevoTurno } from "./validacion.js"

// Rutas de la turnera, montadas en /api/turnos. Las rutas no tienen lógica:
// validan la entrada, llaman al service y devuelven. Así el service se puede
// probar sin levantar un servidor.
export const turnos = Router()

// Catálogo de servicios activos.
turnos.get("/servicios", async (_req, res) => {
  res.json(await service.listarServicios())
})

turnos.get("/servicios/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id)
  res.json(await service.obtenerServicio(id))
})

// Agenda semanal del local. El front la usa para saber qué días deshabilitar en
// el calendario: los días que no aparecen están cerrados.
turnos.get("/horarios", async (_req, res) => {
  res.json(await service.listarHorarios())
})

// Horarios libres para un servicio en un día. Si el local no atiende, va vacío.
turnos.get("/disponibilidad", async (req, res) => {
  const { servicioId, fecha } = consultaDisponibilidad.parse(req.query)
  res.json(await service.calcularDisponibilidad(servicioId, fecha))
})

// Reserva. El cliente no tiene cuenta: se identifica por teléfono.
turnos.post("/", async (req, res) => {
  const turno = await service.crearTurno(nuevoTurno.parse(req.body))
  res.status(201).json(turno)
})
