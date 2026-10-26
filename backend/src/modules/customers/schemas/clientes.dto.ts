/** Lo que sale por HTTP: solo los campos que usa cada pantalla del panel. */
import type { Cliente } from "../models/cliente.model.js"
import type { ClienteConActividad, Ficha } from "../services/clientes.usecases.js"

/** Una fila de la lista de Clientas, y lo que se elige al dar un turno. */
export function aClienteEnLista(c: ClienteConActividad) {
  return {
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono,
    visitas: c.visitas,
    ultimaVisita: c.ultimaVisita,
    proximoTurno: c.proximoTurno,
  }
}

/** Los datos editables de una clienta: lo que devuelven el alta y la edición. */
export function aCliente(c: Cliente) {
  return {
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono,
    email: c.email,
    cumple: c.cumple,
    notas: c.notas,
  }
}

/** La ficha completa: datos, resumen y los dos historiales (turnos y compras). */
export function aFicha(f: Ficha) {
  return {
    ...aCliente(f),
    clienteDesde: f.clienteDesde,
    visitas: f.visitas,
    ausencias: f.ausencias,
    gastado: f.gastado,
    ultimaVisita: f.ultimaVisita,
    proximoTurno: f.proximoTurno,
    turnos: f.turnos.map((t) => ({ id: t.id, estado: t.estado, fecha: t.fecha, horaInicio: t.horaInicio, servicio: t.servicio, precio: t.precio })),
    pedidos: f.pedidos.map((p) => ({ id: p.id, estado: p.estado, fecha: p.fecha, total: p.total, unidades: p.unidades })),
  }
}

/** Una ficha que podría ser la misma persona (al unir). */
export function aFichaCorta(c: Cliente) {
  return { id: c.id, nombre: c.nombre, apellido: c.apellido, telefono: c.telefono }
}

/** Unir dos fichas: la que queda y cuánto se le pasó. */
export const aUnion = (id: number, movido: { turnos: number; compras: number }) => ({ id, turnos: movido.turnos, compras: movido.compras })
