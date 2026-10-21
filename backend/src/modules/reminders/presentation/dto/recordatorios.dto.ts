/** Lo que SALE por HTTP de recordatorios: lo que usan las pestañas "Para mandar" y "Mensajes". */
import type { Aviso } from "../../application/recordatorios.usecases.js"
import type { Tipo } from "../../domain/recordatorio.model.js"
import type { AvisoHecho } from "../../domain/recordatorios.ports.js"

/** Un aviso de "Para mandar": quién, por qué y el mensaje armado. `registro` vuelve al marcarlo. */
export const aAviso = (a: Aviso) => ({
  momento: a.momento,
  tipo: { id: a.tipo.id, nombre: a.tipo.nombre },
  cliente: { id: a.cliente.id, nombre: a.cliente.nombre, apellido: a.cliente.apellido, telefono: a.cliente.telefono },
  turno: a.turno ? { id: a.turno.id, fecha: a.turno.fecha, hora: a.turno.hora, servicio: a.turno.servicio } : null,
  cumple: a.cumple ? { dia: a.cumple.dia, mes: a.cumple.mes, faltan: a.cumple.faltan } : null,
  mensaje: a.mensaje,
  registro: a.registro,
})

/** Lo hecho hoy (para deshacer). */
export const aHecho = (h: AvisoHecho) => ({
  id: h.id,
  estado: h.estado,
  tipo: h.tipo,
  cliente: { nombre: h.cliente.nombre, apellido: h.cliente.apellido },
})

/** Un tipo, como lo edita la pestaña "Mensajes". */
export const aTipo = (t: Tipo) => ({
  id: t.id,
  nombre: t.nombre,
  momento: t.momento,
  horasAntes: t.horasAntes,
  dias: t.dias,
  servicio: t.servicio ? { id: t.servicio.id, nombre: t.servicio.nombre } : null,
  mensaje: t.mensaje,
})
