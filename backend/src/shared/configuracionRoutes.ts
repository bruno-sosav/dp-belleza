import { Router } from "express"
import { CLAVES_PUBLICAS, leerConfigs } from "./configuracion.js"
import { turnos } from "../modules/appointments/appointments.module.js"
import { pagos } from "../modules/payments/payments.module.js"

// Datos de contacto del local para la web pública, montado en /api/configuracion.
export const configuracionPublica = Router()

configuracionPublica.get("/", async (_req, res) => {
  const c = await leerConfigs(CLAVES_PUBLICAS)
  res.json({
    nombre: c.nombre_negocio ?? "",
    /** Normalizado (549 + 10 dígitos), listo para wa.me. Vacío si no se cargó. */
    telefono: c.telefono_negocio ?? "",
    direccion: c.direccion_negocio ?? "",
    email: c.email_negocio ?? "",
    /** Hasta cuántas horas antes puede cancelar sola desde la web. */
    cancelacionHoras: Number(c.cancelacion_horas_minimas ?? 24),
    /** Con cuántas horas de anticipación como mínimo, y hasta cuántos días para adelante, se reserva. */
    reservaMinHoras: Number(c.reserva_anticipacion_min_horas ?? 2),
    reservaMaxDias: Number(c.reserva_anticipacion_max_dias ?? 60),
    /** % de seña que se cobra al reservar. 0 si no hay, o si Mercado Pago no está conectado. */
    senaPorcentaje: await turnos.porcentajeSena(),
    /** null si el local no conectó Mercado Pago. */
    mercadopagoPublicKey: await pagos.publicKey(),
  })
})
