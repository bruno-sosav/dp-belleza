/** Lo que SALE por HTTP de recordatorios: lo que usan las pestañas "Para mandar" y "Mensajes". */
import type { Aviso } from "../application/recordatorios.js"
import type { Tipo } from "../domain/recordatorio.js"
import type { AvisoHecho } from "../domain/reminders.ports.js"

export const aAviso = (a: Aviso) => a

export const aHecho = (h: AvisoHecho) => ({ id: h.id, estado: h.estado, tipo: h.tipo, cliente: h.cliente })

export const aTipo = (t: Tipo) => t
