/**
 * Módulo de turnos (appointments). Raíz de composición: crea las
 * implementaciones concretas, las inyecta en los casos de uso y exporta solo
 * lo que el resto del sistema puede usar.
 *
 * Dos partes:
 *   - la AGENDA (`agenda`): horario de atención, días cerrados, reglas de
 *     reserva, disponibilidad y "¿está libre este lugar?";
 *   - los TURNOS (`turnos`): reservar desde la web, Mi turno, la seña, y dar,
 *     reprogramar, cambiar de estado y completar desde el panel.
 */
import { unidadDeTrabajoMySql } from "../../core/database/MySqlUnidadDeTrabajo.js"
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
import {
  CambiarEstadoTurno,
  CompletarTurno,
  DarTurno,
  GestionarSenas,
  MiTurno,
  ReprogramarTurno,
  ReservarTurno,
  VerTurnos,
  type TurnosDeps,
} from "./application/turnos.js"
import {
  aPagoDeSena,
  cajaDeTurnos,
  clientesDeTurnos,
  configuracionDeTurnos,
  pasarelaMercadoPago,
  recordatoriosDeTurnos,
  serviciosDeTurnos,
} from "./infrastructure/adaptadores.js"
import { MySqlConsultasDeTurnos } from "./infrastructure/MySqlConsultasDeTurnos.js"
import { MySqlTurnoRepository } from "./infrastructure/MySqlTurnoRepository.js"
import { TurnosController } from "./presentation/turnos.controller.js"
import { rutasTurnosPanel, rutasTurnosWeb } from "./presentation/turnos.routes.js"
import type { PagoMP } from "../../shared/mercadopago.js"

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

// ---------------------------------------------------------------- turnos

const deps: TurnosDeps = {
  turnos: new MySqlTurnoRepository(),
  consultas: new MySqlConsultasDeTurnos(),
  lugar: verificarLugar,
  clientes: clientesDeTurnos,
  servicios: serviciosDeTurnos,
  pasarela: pasarelaMercadoPago,
  caja: cajaDeTurnos,
  configuracion: configuracionDeTurnos,
  reservas: configuracion,
  recordatorios: recordatoriosDeTurnos,
  unidad: unidadDeTrabajoMySql,
  reloj,
}
const cambiarEstado = new CambiarEstadoTurno(deps)
const senas = new GestionarSenas(deps)
const turnosController = new TurnosController(
  {
    reservar: new ReservarTurno(deps),
    dar: new DarTurno(deps),
    reprogramar: new ReprogramarTurno(deps),
    cambiarEstado,
    completar: new CompletarTurno(deps, cambiarEstado),
    ver: new VerTurnos(deps),
    miTurno: new MiTurno(deps),
    senas,
  },
  reloj,
)

/** Lo que los turnos ofrecen al resto del sistema. */
export const turnos = {
  /** Reservar, Mi turno y la seña: se montan bajo /api/turnos (DESPUÉS de las de la agenda). */
  rutasWeb: rutasTurnosWeb(turnosController),
  /** Los turnos del panel: se montan bajo /api/admin, después de requiereLogin y de agenda.rutasPanel. */
  rutasPanel: rutasTurnosPanel(turnosController),

  /** Cancela los turnos cuya seña venció sin pagar. Lo corre index.ts cada minuto. */
  vencerSenas: () => senas.vencer(),
  /** Un pago de Mercado Pago con referencia "turno-<id>" (lo llama el aviso de Mercado Pago). */
  aplicarPagoSena: (turnoId: number, pago: PagoMP) => senas.aplicarPago(turnoId, aPagoDeSena(pago)),
  /** El % de seña que se cobra de verdad (0 si Mercado Pago no está conectado). */
  porcentajeSena: () => senas.porcentaje(),
}
