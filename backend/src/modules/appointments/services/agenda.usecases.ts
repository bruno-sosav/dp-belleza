/**
 * Casos de uso de la agenda: el horario de atención, los días cerrados y qué
 * horarios ofrecer. Sin SQL ni Express: reglas del dominio y puertos.
 */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Reloj } from "../../../core/reloj.port.js"
import { aDateTime, aMinutos, diaSemanaISO } from "../../../core/tiempo.util.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type {
  BloqueoRepository,
  ConfiguracionDeReservas,
  HorarioRepository,
  OcupacionDeAgenda,
  ServiciosDeAgenda,
  TurnoPedido,
} from "../models/agenda.ports.js"
import { problemaDeBloqueo, type Bloqueo } from "../models/bloqueo.model.js"
import { horariosDelDia, type Ocupado, type Slot } from "../models/disponibilidad.model.js"
import { entraEnHorario, franjasDelDia, problemaDeHorario, problemaEnFranjas, type Franja } from "../models/horario.model.js"

const ahoraComoTexto = (reloj: Reloj) => {
  const { fecha, minutos } = reloj.ahora()
  return aDateTime(fecha, minutos)
}

export class ConsultarHorario {
  constructor(private horarios: HorarioRepository) {}

  ejecutar(): Promise<Franja[]> {
    return this.horarios.listar()
  }
}

/**
 * Reemplaza el horario de la semana. No cancela turnos: devuelve los pedidos
 * que quedaron afuera para que la dueña les avise.
 */
export class CambiarHorario {
  constructor(
    private horarios: HorarioRepository,
    private ocupacion: OcupacionDeAgenda,
    private reloj: Reloj,
  ) {}

  async ejecutar(franjas: Franja[]): Promise<{ horarios: Franja[]; turnosFuera: TurnoPedido[] }> {
    const problema = problemaEnFranjas(franjas)
    if (problema) throw invalido(problema)
    await this.horarios.reemplazar(franjas)
    const turnosFuera = (await this.ocupacion.pedidosFuturos(ahoraComoTexto(this.reloj))).filter(
      (t) => !entraEnHorario(diaSemanaISO(t.fecha), t.horaInicio, t.horaFin, franjas),
    )
    return { horarios: await this.horarios.listar(), turnosFuera }
  }
}

/** Días cerrados. Tampoco cancelan turnos: crear uno devuelve los que caen adentro. */
export class GestionarBloqueos {
  constructor(
    private bloqueos: BloqueoRepository,
    private ocupacion: OcupacionDeAgenda,
    private reloj: Reloj,
  ) {}

  listar(rango?: { desde: string; hasta: string }): Promise<Bloqueo[]> {
    return rango ? this.bloqueos.entre(rango.desde, rango.hasta) : this.bloqueos.vigentes(ahoraComoTexto(this.reloj))
  }

  async crear(datos: { desde: string; hasta: string; motivo: string | null }): Promise<{ bloqueo: Bloqueo; turnosAfectados: TurnoPedido[] }> {
    const problema = problemaDeBloqueo(datos.desde, datos.hasta, ahoraComoTexto(this.reloj).slice(0, 16))
    if (problema) throw invalido(problema)
    const bloqueo = await this.bloqueos.crear(datos)
    const turnosAfectados = await this.ocupacion.pedidosFuturos(ahoraComoTexto(this.reloj), {
      desde: `${datos.desde}:00`,
      hasta: `${datos.hasta}:00`,
    })
    return { bloqueo, turnosAfectados }
  }

  async quitar(id: number): Promise<void> {
    if (!(await this.bloqueos.eliminar(id))) throw noEncontrado("Bloqueo")
  }
}

/**
 * Qué horarios ofrecer de un servicio un día. La web aplica las reglas de
 * anticipación; el panel no, y al reprogramar puede excluir el propio turno.
 */
export class CalcularDisponibilidad {
  constructor(
    private horarios: HorarioRepository,
    private bloqueos: BloqueoRepository,
    private ocupacion: OcupacionDeAgenda,
    private configuracion: ConfiguracionDeReservas,
    private servicios: ServiciosDeAgenda,
    private reloj: Reloj,
  ) {}

  async ejecutar(servicioId: number, fecha: string, { paraLaWeb = false, excluirTurnoId = 0 } = {}): Promise<Slot[]> {
    // Al reprogramar, el servicio del turno puede estar pausado: igual hay que poder moverlo.
    const duracionMin = await this.servicios.duracion(servicioId, { incluirPausados: excluirTurnoId > 0 })
    const franjas = franjasDelDia(await this.horarios.listar(), fecha)
    if (!franjas.length) return [] // cerrado
    const [turnos, cerrados, paso, reglas] = await Promise.all([
      this.ocupacion.turnosDelDia(fecha, { excluirTurnoId }),
      this.bloqueos.ocupadoDelDia(fecha),
      this.configuracion.intervaloMin(),
      paraLaWeb ? this.configuracion.reglas() : Promise.resolve(null),
    ])
    return horariosDelDia({ fecha, franjas, duracionMin, paso, ocupados: [...turnos, ...cerrados], ahora: this.reloj.ahora(), reglas })
  }
}

/**
 * Lo que necesitan reservar y reprogramar de la agenda: que el turno entre en
 * el horario y que el lugar esté libre. Corre dentro de su transacción.
 */
export class VerificarLugar {
  constructor(
    private horarios: HorarioRepository,
    private bloqueos: BloqueoRepository,
    private ocupacion: OcupacionDeAgenda,
  ) {}

  /** Lanza `conflicto` si el turno no entra en el horario de atención de ese día. */
  async dentroDelHorario(fecha: string, inicio: number, fin: number, duracionMin: number): Promise<void> {
    const problema = problemaDeHorario(franjasDelDia(await this.horarios.listar(), fecha), inicio, fin, duracionMin)
    if (problema) throw conflicto(problema)
  }

  /** Todo lo ocupado ese día (turnos y bloqueos), bloqueando los turnos hasta el fin de la transacción. */
  async ocupado(fecha: string, tx: Transaccion, { excluirTurnoId = 0 } = {}): Promise<Ocupado[]> {
    return [
      ...(await this.ocupacion.turnosDelDia(fecha, { tx, bloquear: true, excluirTurnoId })),
      ...(await this.bloqueos.ocupadoDelDia(fecha, tx)),
    ]
  }

  /** Un turno de esas horas se pisa con algo de lo ocupado. */
  static sePisa(ocupado: Ocupado[], inicio: string | number, fin: string | number): boolean {
    const desde = typeof inicio === "number" ? inicio : aMinutos(inicio)
    const hasta = typeof fin === "number" ? fin : aMinutos(fin)
    return ocupado.some((o) => desde < o.hasta && o.desde < hasta)
  }
}
