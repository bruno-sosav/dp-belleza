/**
 * Raíz de composición de turnos. `agenda`: horario, días cerrados, reglas y disponibilidad.
 * `turnos`: reservar, Mi turno, seña, y dar/reprogramar/completar desde el panel.
 */
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import { relojDelSistema } from "../../core/reloj.port.js"
import type { Transaccion } from "../../core/transaccion.port.js"
import { CalcularDisponibilidad, CambiarHorario, ConsultarHorario, GestionarBloqueos, VerificarLugar } from "./services/agenda.usecases.js"
import { ConfiguracionDeReservasDesdeAjustes } from "./integrations/configuracionReservas.adapter.js"
import { MySqlBloqueoRepository } from "./repositories/bloqueo.repository.js"
import { MySqlHorarioRepository } from "./repositories/horario.repository.js"
import { MySqlOcupacionDeAgenda } from "./repositories/ocupacion.queries.js"
import { ServiciosDesdeCatalogo } from "./integrations/catalogo.adapter.js"
import { AgendaController } from "./controllers/agenda.controller.js"
import { rutasAgendaPanel, rutasAgendaWeb } from "./controllers/agenda.routes.js"
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
} from "./services/turnos.usecases.js"
import {
  cajaDeTurnos,
  clientesDeTurnos,
  configuracionDeTurnos,
  pasarelaMercadoPago,
  serviciosDeTurnos,
} from "./integrations/turnos.adapter.js"
import { MySqlConsultasDeTurnos } from "./repositories/turnos.queries.js"
import { MySqlTurnoRepository } from "./repositories/turno.repository.js"
import { TurnosController } from "./controllers/turnos.controller.js"
import { rutasTurnosPanel, rutasTurnosWeb } from "./controllers/turnos.routes.js"
import { pagos } from "../payments/payments.module.js"
import type { PagoDeSena } from "./models/sena.model.js"
import type { Transaccion as Tx } from "../../core/transaccion.port.js"

const horarios = new MySqlHorarioRepository()
const bloqueos = new MySqlBloqueoRepository()
const ocupacion = new MySqlOcupacionDeAgenda()
const configuracion = new ConfiguracionDeReservasDesdeAjustes()
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

// Quienes se anotaron para enterarse de un turno reprogramado (recordatorios).
const alReprogramar: ((turnoId: number, tx: Tx) => Promise<void>)[] = []

const deps: TurnosDeps = {
  turnos: new MySqlTurnoRepository(),
  consultas: new MySqlConsultasDeTurnos(cajaDeTurnos),
  lugar: verificarLugar,
  clientes: clientesDeTurnos,
  servicios: serviciosDeTurnos,
  pasarela: pasarelaMercadoPago,
  caja: cajaDeTurnos,
  configuracion: configuracionDeTurnos,
  reservas: configuracion,
  avisos: {
    reprogramado: async (turnoId, tx) => {
      for (const escuchar of alReprogramar) await escuchar(turnoId, tx)
    },
  },
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

// Pagos no depende de turnos: turnos se conecta a pagos. Así la caja sabe de
// quién es un turno al anotar un cobro, y el aviso de Mercado Pago de una seña
// ("turno-<id>") llega acá.
pagos.conectarTurnos({
  clienteDelTurno: async (id, tx) => (await deps.turnos.porId(id, tx))?.clienteId ?? null,
  aplicarPagoSena: (id, pago) => senas.aplicarPago(id, pago),
})

/** Lo que los turnos ofrecen al resto del sistema. */
export const turnos = {
  /** Reservar, Mi turno y la seña: se montan bajo /api/turnos (DESPUÉS de las de la agenda). */
  rutasWeb: rutasTurnosWeb(turnosController),
  /** Los turnos del panel: se montan bajo /api/admin, después de requiereLogin y de agenda.rutasPanel. */
  rutasPanel: rutasTurnosPanel(turnosController),

  /** Cancela los turnos cuya seña venció sin pagar. Lo corre index.ts cada minuto. */
  vencerSenas: () => senas.vencer(),
  /** Un pago aprobado de la seña (normalmente llega solo, por el aviso de Mercado Pago). */
  aplicarPagoSena: (turnoId: number, pago: PagoDeSena) => senas.aplicarPago(turnoId, pago),
  /** Anotarse para enterarse cuando un turno pedido se mueve de día u hora (corre dentro de la transacción). */
  alReprogramar: (escuchar: (turnoId: number, tx: Tx) => Promise<void>) => {
    alReprogramar.push(escuchar)
  },
  /** El % de seña que se cobra de verdad (0 si Mercado Pago no está conectado). */
  porcentajeSena: () => senas.porcentaje(),
}
