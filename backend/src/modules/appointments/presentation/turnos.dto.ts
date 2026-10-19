/**
 * Lo que SALE por HTTP de los turnos. Cada respuesta con lo que usa la
 * pantalla que la pide (revisado contra la web y el panel); nunca la fila de
 * la base ni la entidad entera.
 */
import type { EstadoMiTurno, ReservaHecha } from "../application/turnos.js"
import type { TurnoDeLaClienta, TurnoDelPanel } from "../domain/turnos.ports.js"
import { codigoDeTurno } from "../domain/turno.js"

const nombreCompleto = (c: { nombre: string; apellido: string | null }) => [c.nombre, c.apellido].filter(Boolean).join(" ")

/** La web, al reservar: con esto arma la confirmación o va a pagar la seña. */
export const aReservaHecha = (r: ReservaHecha) => ({
  id: r.id,
  estado: r.estado,
  fecha: r.fecha,
  horaInicio: r.horaInicio,
  precio: r.precio,
  token: r.token,
  ...(r.sena ? { sena: r.sena } : {}),
})

/** "¡Turno reservado!" al recargar la página (por el token de la URL). */
export const aReserva = (t: TurnoDeLaClienta) => ({
  id: t.id,
  estado: t.estado,
  fecha: t.fecha,
  horaInicio: t.horaInicio,
  horaFin: t.horaFin,
  precio: t.precio,
  notas: t.notas,
  servicio: t.servicio,
  cliente: { nombre: nombreCompleto(t.cliente), telefono: t.cliente.telefono, email: t.cliente.email },
})

/** Mi turno. */
export const aMiTurno = (s: EstadoMiTurno) => ({
  codigo: codigoDeTurno(s.turno.id),
  estado: s.turno.estado,
  nombre: s.turno.cliente.nombre,
  servicio: { id: s.turno.servicio.id, nombre: s.turno.servicio.nombre, duracionMin: s.turno.servicio.duracionMin },
  fecha: s.turno.fecha,
  hora: s.turno.horaInicio,
  precio: s.turno.precio,
  /** Si la web le muestra el botón de cancelar. */
  puedeCancelar: s.puedeCancelar,
  /** Si ya no puede sola porque falta poco (para explicarle y ofrecer WhatsApp). */
  fueraDeTermino: s.fueraDeTermino,
  horasMinimas: s.horasMinimas,
})

/** La página de vuelta de Mercado Pago. */
export const aSena = (t: TurnoDeLaClienta) => ({
  codigo: codigoDeTurno(t.id),
  estado: t.estado,
  canceladoPor: t.canceladoPor,
  sena: t.sena ? { monto: t.sena.monto, estado: t.sena.estado } : null,
  servicio: t.servicio.nombre,
  fecha: t.fecha,
  hora: t.horaInicio,
  precio: t.precio,
  venceA: t.senaVenceA,
})

/** Un turno en el panel (Hoy, Agenda, detalle). */
export const aTurnoDelPanel = (t: TurnoDelPanel) => ({
  id: t.id,
  estado: t.estado,
  canceladoPor: t.canceladoPor,
  cobrado: t.cobrado,
  sena: t.sena ? { monto: t.sena.monto, estado: t.sena.estado } : null,
  fecha: t.fecha,
  horaInicio: t.horaInicio,
  horaFin: t.horaFin,
  precio: t.precio,
  notas: t.notas,
  servicio: { id: t.servicio.id, nombre: t.servicio.nombre },
  cliente: t.cliente,
})
