/**
 * Módulo de turnos (appointments). Raíz de composición: crea las
 * implementaciones concretas, las inyecta en los casos de uso y exporta solo
 * lo que el resto del sistema puede usar.
 *
 * Por ahora tiene la AGENDA: horario de atención, días cerrados, reglas de
 * reserva y disponibilidad. Reservar, reprogramar y cambiar el estado de un
 * turno siguen en turnera/ y admin/turnos.ts hasta el próximo paso, y usan la
 * agenda a través de `agenda`.
 */
import { relojDelSistema } from "../../core/reloj.js"
import type { Transaccion } from "../../core/transaccion.js"
import { CalcularDisponibilidad, CambiarHorario, ConsultarHorario, GestionarBloqueos, VerificarLugar } from "./application/agenda.js"
import { ConfiguracionDeReservasDesdeConfig } from "./infrastructure/ConfiguracionDeReservasDesdeConfig.js"
import { MySqlBloqueoRepository } from "./infrastructure/MySqlBloqueoRepository.js"
import { MySqlHorarioRepository } from "./infrastructure/MySqlHorarioRepository.js"
import { MySqlOcupacionDeAgenda } from "./infrastructure/MySqlOcupacionDeAgenda.js"
import { ServiciosDesdeCatalogo } from "./infrastructure/ServiciosDesdeCatalogo.js"
import { AgendaController } from "./presentation/agenda.controller.js"
import { rutasAgendaPanel, rutasAgendaWeb } from "./presentation/agenda.routes.js"

const horarios = new MySqlHorarioRepository()
const bloqueos = new MySqlBloqueoRepository()
const ocupacion = new MySqlOcupacionDeAgenda()
const configuracion = new ConfiguracionDeReservasDesdeConfig()
const servicios = new ServiciosDesdeCatalogo()
const reloj = relojDelSistema

const verificarLugar = new VerificarLugar(horarios, bloqueos, ocupacion)
const agendaController = new AgendaController({
  consultarHorario: new ConsultarHorario(horarios),
  cambiarHorario: new CambiarHorario(horarios, ocupacion, reloj),
  bloqueos: new GestionarBloqueos(bloqueos, ocupacion, reloj),
  disponibilidad: new CalcularDisponibilidad(horarios, bloqueos, ocupacion, configuracion, servicios, reloj),
})

/** Lo que la agenda ofrece al resto del sistema. */
export const agenda = {
  /** /horarios y /disponibilidad para la web: se montan bajo /api/turnos. */
  rutasWeb: rutasAgendaWeb(agendaController),
  /** Horario, días cerrados y disponibilidad del panel: se montan bajo /api/admin. */
  rutasPanel: rutasAgendaPanel(agendaController),

  /** Lanza `conflicto` si el turno no entra en el horario de atención de ese día. */
  dentroDelHorario: (fecha: string, inicio: number, fin: number, duracionMin: number) =>
    verificarLugar.dentroDelHorario(fecha, inicio, fin, duracionMin),
  /** Todo lo ocupado ese día (turnos y bloqueos), bloqueado hasta el fin de la transacción. */
  ocupado: (fecha: string, tx: Transaccion, opciones?: { excluirTurnoId?: number }) => verificarLugar.ocupado(fecha, tx, opciones),
  /** Si un turno de esas horas se pisa con lo ocupado. */
  sePisa: VerificarLugar.sePisa,
  /** Reglas de la reserva web (anticipación). */
  reglasDeReserva: () => configuracion.reglas(),
}
