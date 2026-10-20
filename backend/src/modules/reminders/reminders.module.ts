/**
 * Módulo de recordatorios (reminders). Raíz de composición: crea las
 * implementaciones concretas, las inyecta en los casos de uso y exporta solo
 * lo que el resto del sistema puede usar.
 *
 * Es dueño de los tipos de recordatorio y de lo ya mandado. Turnos y clientas
 * no lo conocen: este módulo se anota en sus avisos ("se reprogramó un turno",
 * "se unieron dos fichas"), así no hay dependencias en círculo.
 */
import { relojDelSistema } from "../../core/reloj.js"
import { turnos } from "../appointments/appointments.module.js"
import { clientes } from "../customers/customers.module.js"
import { GestionarTipos, MarcarRecordatorio, VerRecordatorios } from "./application/recordatorios.js"
import { MySqlConsultasDeRecordatorios } from "./infrastructure/MySqlConsultasDeRecordatorios.js"
import { MySqlRegistroRepository } from "./infrastructure/MySqlRegistroRepository.js"
import { MySqlTipoRepository } from "./infrastructure/MySqlTipoRepository.js"
import { NombreDesdeConfiguracion } from "./infrastructure/NombreDesdeConfiguracion.js"
import { RecordatoriosController } from "./presentation/recordatorios.controller.js"
import { rutasPanelRecordatorios } from "./presentation/recordatorios.routes.js"

const tipos = new MySqlTipoRepository()
const registros = new MySqlRegistroRepository()

const controller = new RecordatoriosController({
  ver: new VerRecordatorios(tipos, registros, new MySqlConsultasDeRecordatorios(), new NombreDesdeConfiguracion(), relojDelSistema),
  marcar: new MarcarRecordatorio(registros),
  tipos: new GestionarTipos(tipos),
})

// Si un turno se movió de día u hora, lo ya mandado no vale: hay que volver a avisarle.
turnos.alReprogramar((turnoId, tx) => registros.olvidarDelTurno(turnoId, tx))
// Al unir dos fichas, lo mandado a una pasa a la otra.
clientes.alUnirFichas((deId, aId, tx) => registros.reasignarCliente(deId, aId, tx))

/** Lo que recordatorios ofrece al resto del sistema. */
export const recordatorios = {
  /** Para mandar, hechos y tipos: se montan bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPanelRecordatorios(controller),
}
