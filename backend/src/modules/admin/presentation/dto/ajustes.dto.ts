/** Lo que SALE de los ajustes. */
import { CLAVES_AJUSTES, type Ajustes } from "../../domain/ajustes.model.js"
import type { VerAjustesPublicos } from "../../application/ajustes.usecases.js"

/** Ajustes del panel: cada clave conocida, como texto (lo que edita el formulario). */
export const aAjustesDelPanel = (a: Ajustes) => Object.fromEntries(CLAVES_AJUSTES.map((c) => [c, a[c] ?? ""]))

/** Lo que ve la web: contacto, reglas de reserva y la seña. Nunca el resto de los ajustes. */
export const aAjustesPublicos = (p: Awaited<ReturnType<VerAjustesPublicos["ejecutar"]>>) => ({
  nombre: p.nombre,
  /** Normalizado (549 + 10 dígitos), listo para wa.me. Vacío si no se cargó. */
  telefono: p.telefono,
  direccion: p.direccion,
  email: p.email,
  /** Hasta cuántas horas antes puede cancelar sola desde la web. */
  cancelacionHoras: p.cancelacionHoras,
  /** Con cuántas horas de anticipación como mínimo, y hasta cuántos días para adelante, se reserva. */
  reservaMinHoras: p.reservaMinHoras,
  reservaMaxDias: p.reservaMaxDias,
  /** % de seña que se cobra al reservar. 0 si no hay, o si Mercado Pago no está conectado. */
  senaPorcentaje: p.senaPorcentaje,
  /** null si el local no conectó Mercado Pago. */
  mercadopagoPublicKey: p.mercadopagoPublicKey,
})
