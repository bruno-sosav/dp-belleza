/**
 * Rutas de la turnera. Se montan bajo /api/turnos (ver src/server.ts).
 *
 * Las rutas no tienen lógica: validan la entrada, llaman al service y devuelven.
 * Así el service se puede probar sin levantar un servidor.
 */
import { Router } from "express"
import * as service from "./service.ts"
import { parsearId, parsearNuevoTurno } from "./schemas.ts"
import { validarFecha } from "./tiempo.ts"
import { badRequest } from "../shared/errors.ts"

export const turneraRouter = Router()

/** GET /api/turnos/servicios — catálogo de servicios activos. */
turneraRouter.get("/servicios", async (_req, res) => {
  res.json(await service.listarServicios())
})

/** GET /api/turnos/servicios/:id */
turneraRouter.get("/servicios/:id", async (req, res) => {
  res.json(await service.obtenerServicio(parsearId(req.params.id, "El servicio")))
})

/**
 * GET /api/turnos/horarios — agenda semanal del local.
 * El front lo usa para saber qué días deshabilitar en el calendario.
 */
turneraRouter.get("/horarios", async (_req, res) => {
  res.json(await service.listarHorarios())
})

/**
 * GET /api/turnos/disponibilidad?servicioId=1&fecha=2026-10-20
 * Horarios libres para ese servicio ese día. Si el local no atiende, va vacío.
 */
turneraRouter.get("/disponibilidad", async (req, res) => {
  const { servicioId, fecha } = req.query
  if (typeof fecha !== "string") throw badRequest("Falta el parámetro fecha (YYYY-MM-DD).")
  res.json(
    await service.calcularDisponibilidad(
      parsearId(servicioId, "El servicio"),
      validarFecha(fecha),
    ),
  )
})

/** POST /api/turnos — reserva un turno. */
turneraRouter.post("/", async (req, res) => {
  const turno = await service.crearTurno(parsearNuevoTurno(req.body))
  res.status(201).json(turno)
})
