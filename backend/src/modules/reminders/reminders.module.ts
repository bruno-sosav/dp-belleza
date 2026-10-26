/** Raíz de composición de recordatorios. Se suscribe a avisos de turnos y clientas: nadie lo importa. */
import { relojDelSistema } from "../../core/reloj.port.js"
import { turnos } from "../appointments/appointments.module.js"
import { clientes } from "../customers/customers.module.js"
import { GestionarTipos, MarcarRecordatorio, VerRecordatorios } from "./services/recordatorios.usecases.js"
import { MySqlConsultasDeRecordatorios } from "./repositories/recordatorios.queries.js"
import { MySqlRegistroRepository } from "./repositories/registro.repository.js"
import { MySqlTipoRepository } from "./repositories/tipoRecordatorio.repository.js"
import { NombreDesdeAjustes } from "./integrations/nombreNegocio.adapter.js"
import { RecordatoriosController } from "./controllers/recordatorios.controller.js"
import { rutasPanelRecordatorios } from "./controllers/recordatorios.routes.js"

const tipos = new MySqlTipoRepository()
const registros = new MySqlRegistroRepository()

const controller = new RecordatoriosController({
  ver: new VerRecordatorios(tipos, registros, new MySqlConsultasDeRecordatorios(), new NombreDesdeAjustes(), relojDelSistema),
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
