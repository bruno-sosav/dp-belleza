/** Web (/api/turnos): /horarios, /disponibilidad · Panel (/api/admin): /horarios, /bloqueos…, /turnos/disponibilidad. */
import { Router } from "express"
import type { AgendaController } from "./agenda.controller.js"

export function rutasAgendaWeb(c: AgendaController): Router {
  const r = Router()
  r.get("/horarios", c.horario)
  r.get("/disponibilidad", c.disponibilidadWeb)
  return r
}

export function rutasAgendaPanel(c: AgendaController): Router {
  const r = Router()
  r.put("/horarios", c.cambiarHorario)
  r.get("/bloqueos", c.listarBloqueos)
  r.post("/bloqueos", c.crearBloqueo)
  r.delete("/bloqueos/:id", c.quitarBloqueo)
  // Antes que /turnos/:id (de las rutas de turnos), para que "disponibilidad" no se lea como un id.
  r.get("/turnos/disponibilidad", c.disponibilidadPanel)
  return r
}
