/**
 * Rutas de los turnos. Mismas URLs de antes de la reorganización:
 *   web, bajo /api/turnos:  POST /, /reserva/:token, /mi-turno…, /sena/:token…
 *   panel, bajo /api/admin: /turnos, /turnos/:id, /turnos/:id/estado, /turnos/:id/completar
 */
import { Router } from "express"
import { limitarPorIp } from "../../../../core/http/limitarPorIp.js"
import type { TurnosController } from "../controllers/turnos.controller.js"

export function rutasTurnosWeb(c: TurnosController): Router {
  const r = Router()

  // Cuántas reservas puede HACER una misma conexión por hora. Solo cuentan las
  // que salen bien: equivocarse de horario no gasta intentos. Junto con el tope
  // por clienta, evita que alguien llene la agenda.
  const limiteReservas = limitarPorIp({
    maximo: 6,
    ventanaMs: 60 * 60_000,
    soloExitosos: true,
    mensaje: "Hiciste muchas reservas seguidas. Si necesitás más turnos, escribinos por WhatsApp.",
  })
  // Mi turno: que no se pueda probar códigos ajenos a lo bruto.
  const limiteMiTurno = limitarPorIp({
    maximo: 20,
    ventanaMs: 15 * 60_000,
    mensaje: "Hiciste muchos intentos seguidos. Esperá unos minutos o escribinos por WhatsApp.",
  })

  r.post("/", limiteReservas, c.reservar)
  r.get("/reserva/:token", c.reserva)
  // Por POST y no GET: así el teléfono no queda en la URL ni en los logs.
  r.post("/mi-turno", limiteMiTurno, c.buscarMiTurno)
  r.post("/mi-turno/cancelar", limiteMiTurno, c.cancelarMiTurno)
  r.get("/sena/:token", c.sena)
  r.post("/sena/:token/pagar", c.pagarSena)
  return r
}

export function rutasTurnosPanel(c: TurnosController): Router {
  const r = Router()
  r.get("/turnos", c.listar)
  r.post("/turnos", c.dar)
  r.get("/turnos/:id", c.uno)
  r.patch("/turnos/:id", c.reprogramar)
  r.patch("/turnos/:id/estado", c.cambiarEstado)
  r.post("/turnos/:id/completar", c.completar)
  return r
}
