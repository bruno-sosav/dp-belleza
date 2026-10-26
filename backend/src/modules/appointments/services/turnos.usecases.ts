import { randomBytes } from "node:crypto"
import { conflicto, ErrorDeNegocio, externo, invalido, noEncontrado, noExiste } from "../../../core/negocio.error.js"
import type { Reloj } from "../../../core/reloj.port.js"
import { aDateTime, aHora, aMinutos } from "../../../core/tiempo.util.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import { ocupaAgenda, puedeCambiarEstadoTurno, requiereHaberEmpezado, type EstadoTurno } from "../models/estados.model.js"
import { MAX_TURNOS_PEDIDOS_WEB, problemaDeAnticipacion } from "../models/reglasReserva.model.js"
import { montoSena, referenciaDeSena, resultadoDelPago, SENA_MINUTOS, type PagoDeSena } from "../models/sena.model.js"
import { esPedido, problemaAlDar, problemaAlMover, puedeCancelar, yaEmpezo } from "../models/turno.model.js"
import type { ConfiguracionDeReservas } from "../models/agenda.ports.js"
import type {
  AvisosDeTurnos,
  CajaDeTurnos,
  ClientesDeTurnos,
  ConfiguracionDeTurnos,
  ConsultasDeTurnos,
  EntradaClienta,
  PasarelaDeSenas,
  ServiciosDeTurnos,
  TurnoDeLaClienta,
  TurnoDelPanel,
  TurnoRepository,
} from "../models/turnos.ports.js"
import { VerificarLugar } from "./agenda.usecases.js"

const nuevoToken = () => randomBytes(16).toString("hex")

export type TurnosDeps = {
  turnos: TurnoRepository
  consultas: ConsultasDeTurnos
  lugar: VerificarLugar
  clientes: ClientesDeTurnos
  servicios: ServiciosDeTurnos
  pasarela: PasarelaDeSenas
  caja: CajaDeTurnos
  configuracion: ConfiguracionDeTurnos
  reservas: ConfiguracionDeReservas
  avisos: AvisosDeTurnos
  unidad: UnidadDeTrabajo
  reloj: Reloj
}

/**
 * Común a reservar y dar: valida y chequea el lugar dentro de la transacción con el día bloqueado
 * (dos reservas simultáneas no toman el mismo horario).
 */
async function agendar(
  d: TurnosDeps,
  p: {
    servicioId: number
    fecha: string
    hora: string
    notas: string | null
    estado: EstadoTurno
    respetarHorario: boolean
    clienta: (tx: Transaccion) => Promise<number>
    sena: { porcentaje: number; token: string } | null
    tokenPublico: string | null
  },
) {
  const servicio = await d.servicios.reservable(p.servicioId)
  const inicio = aMinutos(p.hora)
  const fin = inicio + servicio.duracionMin
  const problema = problemaAlDar(p.estado, yaEmpezo(p.fecha, inicio, d.reloj.ahora()), fin, servicio.duracionMin)
  if (problema) throw invalido(problema)
  if (p.respetarHorario) await d.lugar.dentroDelHorario(p.fecha, inicio, fin, servicio.duracionMin)

  return d.unidad.ejecutar(async (tx) => {
    if (VerificarLugar.sePisa(await d.lugar.ocupado(p.fecha, tx), inicio, fin)) throw conflicto("Ese horario ya fue reservado. Elegí otro.")
    const clienteId = await p.clienta(tx)
    const id = await d.turnos.crear(
      {
        clienteId,
        servicioId: servicio.id,
        fecha: p.fecha,
        horaInicio: aHora(inicio),
        horaFin: aHora(fin),
        estado: p.estado,
        // Precio congelado: si mañana sube la lista, este turno conserva el que vio la clienta.
        precio: servicio.precio,
        notas: p.notas,
        sena: p.sena ? { monto: montoSena(servicio.precio, p.sena.porcentaje), token: p.sena.token, venceEnMinutos: SENA_MINUTOS } : null,
        tokenPublico: p.tokenPublico,
      },
      tx,
    )
    return { id, servicio, clienteId, horaInicio: aHora(inicio), horaFin: aHora(fin) }
  })
}

export type ReservaHecha = {
  id: number
  servicio: { id: number; nombre: string }
  fecha: string
  horaInicio: string
  horaFin: string
  precio: number
  estado: EstadoTurno
  token: string
  sena: { monto: number; porcentaje: number; link: string; token: string; venceEnMinutos: number } | null
}

/** La reserva desde la web: reglas de anticipación, tope por clienta y, si corresponde, la seña. */
export class ReservarTurno {
  constructor(private d: TurnosDeps) {}

  async ejecutar(e: { servicioId: number; fecha: string; hora: string; notas?: string; contacto: { nombreCompleto: string } & Omit<EntradaClienta, "nombre" | "apellido"> }): Promise<ReservaHecha> {
    const d = this.d
    const problema = problemaDeAnticipacion(e.fecha, aMinutos(e.hora), d.reloj.ahora(), await d.reservas.reglas())
    if (problema) throw invalido(problema)

    // Seña: solo si la dueña puso un porcentaje y la pasarela está conectada.
    const porcentaje = (await d.pasarela.conectada()) ? await d.configuracion.porcentajeSena() : 0
    const sena = porcentaje > 0 ? { porcentaje, token: nuevoToken() } : null
    const tokenPublico = nuevoToken()

    const hecho = await agendar(d, {
      servicioId: e.servicioId,
      fecha: e.fecha,
      hora: e.hora,
      notas: e.notas ?? null,
      estado: "reservado",
      respetarHorario: true,
      sena,
      tokenPublico,
      clienta: async (tx) => {
        const { nombreCompleto, ...resto } = e.contacto
        const clienteId = await d.clientes.buscarOCrear({ ...d.clientes.separarNombreCompleto(nombreCompleto), ...resto }, tx)
        // Tope por clienta: que nadie llene la agenda desde la web.
        if ((await d.turnos.pedidosFuturosDeCliente(clienteId, tx)) >= MAX_TURNOS_PEDIDOS_WEB) {
          throw conflicto(`Ya tenés ${MAX_TURNOS_PEDIDOS_WEB} turnos reservados. Para reservar otro, escribinos por WhatsApp.`)
        }
        return clienteId
      },
    })
    const reserva: ReservaHecha = {
      id: hecho.id,
      servicio: { id: hecho.servicio.id, nombre: hecho.servicio.nombre },
      fecha: e.fecha,
      horaInicio: hecho.horaInicio,
      horaFin: hecho.horaFin,
      precio: hecho.servicio.precio,
      estado: "reservado",
      token: tokenPublico,
      sena: null,
    }
    if (!sena) return reserva

    // El link se pide FUERA de la transacción (es una llamada a Mercado Pago).
    // Si falla, el turno no puede quedar tomado sin forma de pagar.
    const monto = montoSena(hecho.servicio.precio, sena.porcentaje)
    try {
      const link = await d.pasarela.crearLink({ turnoId: hecho.id, servicio: hecho.servicio.nombre, fecha: e.fecha, hora: hecho.horaInicio, monto, token: sena.token })
      return { ...reserva, sena: { monto, porcentaje: sena.porcentaje, link, token: sena.token, venceEnMinutos: SENA_MINUTOS } }
    } catch (err) {
      await d.turnos.actualizar(hecho.id, { estado: "cancelado", canceladoPor: "sistema", senaEstado: "vencida" })
      throw externo(
        "No pudimos iniciar el pago de la seña con Mercado Pago. Probá de nuevo en un rato o escribinos por WhatsApp.",
        err instanceof ErrorDeNegocio ? err.message : undefined,
      )
    }
  }
}

/** Entra confirmado, o completado si ya pasó. Puede ir fuera de horario, nunca encima de otro turno o bloqueo. */
export class DarTurno {
  constructor(private d: TurnosDeps) {}

  async ejecutar(e: { clienteId: number; servicioId: number; fecha: string; hora: string; notas?: string; fueraDeHorario: boolean }): Promise<number> {
    const pasado = yaEmpezo(e.fecha, aMinutos(e.hora), this.d.reloj.ahora())
    const hecho = await agendar(this.d, {
      servicioId: e.servicioId,
      fecha: e.fecha,
      hora: e.hora,
      notas: e.notas || null,
      estado: pasado ? "completado" : "confirmado",
      respetarHorario: !pasado && !e.fueraDeHorario,
      sena: null,
      tokenPublico: null,
      clienta: async (tx) => {
        if (!(await this.d.clientes.existe(e.clienteId, tx))) throw noEncontrado("Cliente")
        return e.clienteId
      },
    })
    return hecho.id
  }
}

/** Reglas en problemaAlMover. Si cambia el servicio, toma su precio y duración actuales. */
export class ReprogramarTurno {
  constructor(private d: TurnosDeps) {}

  async ejecutar(id: number, c: { fecha?: string; hora?: string; servicioId?: number; notas?: string | null; fueraDeHorario: boolean }): Promise<void> {
    const d = this.d
    await d.unidad.ejecutar(async (tx) => {
      const t = await d.turnos.porId(id, tx, { bloquear: true })
      if (!t) throw noEncontrado("Turno")
      const desdeActual = aMinutos(t.horaInicio)
      const fecha = c.fecha ?? t.fecha
      const desde = c.hora ? aMinutos(c.hora) : desdeActual
      const cambiaServicio = c.servicioId !== undefined && c.servicioId !== t.servicioId
      const mueve = fecha !== t.fecha || desde !== desdeActual || cambiaServicio

      const cambios: Parameters<TurnoRepository["actualizar"]>[1] = {}
      if (c.notas !== undefined) cambios.notas = c.notas || null

      if (mueve) {
        const pasado = yaEmpezo(fecha, desde, d.reloj.ahora())
        const problema = problemaAlMover(t.estado, pasado)
        if (problema) throw problema.tipo === "conflicto" ? conflicto(problema.mensaje) : invalido(problema.mensaje)

        let duracion = aMinutos(t.horaFin) - desdeActual
        if (cambiaServicio) {
          const s = await d.servicios.reservable(c.servicioId!)
          duracion = s.duracionMin
          cambios.servicioId = s.id
          cambios.precio = s.precio
        }
        const hasta = desde + duracion
        if (hasta > 24 * 60) throw invalido(`El turno de ${duracion} minutos terminaría pasada la medianoche.`)
        if (!pasado && !c.fueraDeHorario) await d.lugar.dentroDelHorario(fecha, desde, hasta, duracion)
        // Un "no vino" no ocupa la agenda (otra pudo tomar el horario): no se controla.
        if (t.estado !== "ausente" && VerificarLugar.sePisa(await d.lugar.ocupado(fecha, tx, { excluirTurnoId: id }), desde, hasta)) {
          throw conflicto("Ese horario ya lo ocupa otro turno o un bloqueo.")
        }
        Object.assign(cambios, { fecha, horaInicio: aHora(desde), horaFin: aHora(hasta) })
        // Si se movió de día u hora, se anuncia (recordatorios vuelve a avisarle).
        if (esPedido(t.estado) && (fecha !== t.fecha || desde !== desdeActual)) await d.avisos.reprogramado(id, tx)
      }
      if (Object.keys(cambios).length) await d.turnos.actualizar(id, cambios, tx)
    })
  }
}

/** Cambiar el estado (✅ completado, ❌ no vino / cancelar, deshacer, ✓ confirmó). */
export class CambiarEstadoTurno {
  constructor(private d: TurnosDeps) {}

  /** Dentro de una transacción: lo reusa CompletarTurno. */
  async enTransaccion(id: number, estado: EstadoTurno, tx: Transaccion): Promise<{ clienteId: number }> {
    const t = await this.d.turnos.porId(id, tx, { bloquear: true })
    if (!t) throw noEncontrado("Turno")
    if (t.estado === estado) return { clienteId: t.clienteId }
    if (!puedeCambiarEstadoTurno(t.estado, estado)) throw conflicto(`No se puede pasar un turno de "${t.estado}" a "${estado}"`)
    if (requiereHaberEmpezado(estado) && !yaEmpezo(t.fecha, aMinutos(t.horaInicio), this.d.reloj.ahora())) {
      throw invalido(`Todavía no es la hora del turno: no se puede marcar como "${estado}".`)
    }
    // Vuelve a ocupar la agenda (deshacer un "no vino"): el horario tiene que seguir libre.
    if (ocupaAgenda(estado) && !ocupaAgenda(t.estado) && VerificarLugar.sePisa(await this.d.lugar.ocupado(t.fecha, tx), t.horaInicio, t.horaFin)) {
      throw conflicto("Ese horario ya lo ocupa otro turno o un bloqueo.")
    }
    // Al cancelar se anota quién; si se deshace una cancelación, se borra.
    const canceladoPor = estado === "cancelado" ? { canceladoPor: "local" as const } : t.estado === "cancelado" ? { canceladoPor: null } : {}
    await this.d.turnos.actualizar(id, { estado, ...canceladoPor }, tx)
    // Deshacer un "completado": lo cobrado al terminar sale de la caja (la seña no).
    if (t.estado === "completado") await this.d.caja.anularCobroDelTurno(id, tx)
    return { clienteId: t.clienteId }
  }

  ejecutar(id: number, estado: EstadoTurno): Promise<unknown> {
    return this.d.unidad.ejecutar((tx) => this.enTransaccion(id, estado, tx))
  }
}

/** ✅ Completado y, en la misma operación, lo que se cobró (null = "todavía no cobré"). */
export class CompletarTurno {
  constructor(
    private d: TurnosDeps,
    private estados: CambiarEstadoTurno,
  ) {}

  ejecutar(id: number, cobro: { monto: number; medio: string } | null): Promise<void> {
    return this.d.unidad.ejecutar(async (tx) => {
      const { clienteId } = await this.estados.enTransaccion(id, "completado", tx)
      if (cobro) await this.d.caja.cobrarTurno({ turnoId: id, clienteId, ...cobro }, tx)
    })
  }
}

export class VerTurnos {
  constructor(private d: TurnosDeps) {}

  async uno(id: number): Promise<TurnoDelPanel> {
    const t = await this.d.consultas.delPanel(id)
    if (!t) throw noEncontrado("Turno")
    return t
  }

  entre(desde: string, hasta: string, estado?: EstadoTurno): Promise<TurnoDelPanel[]> {
    return this.d.consultas.delPanelEntre(desde, hasta, estado)
  }

  /** La confirmación de una reserva (pantalla "¡Turno reservado!"), por su token. */
  async reserva(token: string): Promise<TurnoDeLaClienta> {
    const t = await this.d.consultas.porTokenPublico(token)
    if (!t) throw noExiste("No encontramos esa reserva.")
    return t
  }
}

export type EstadoMiTurno = { turno: TurnoDeLaClienta; puedeCancelar: boolean; fueraDeTermino: boolean; horasMinimas: number }

/** Código o teléfono incorrecto dan el mismo error: no se revela cuál falló. */
export class MiTurno {
  constructor(private d: TurnosDeps) {}

  private async situacion(t: TurnoDeLaClienta): Promise<EstadoMiTurno> {
    const horasMinimas = await this.d.configuracion.horasParaCancelar()
    const { fecha, minutos } = this.d.reloj.ahora()
    const ahora = aDateTime(fecha, minutos)
    const inicio = `${t.fecha} ${t.horaInicio}:00`
    const pedido = esPedido(t.estado)
    const puede = pedido && puedeCancelar(inicio, ahora, horasMinimas)
    return { turno: t, puedeCancelar: puede, fueraDeTermino: pedido && inicio > ahora && !puede, horasMinimas }
  }

  private async buscarTurno(id: number, telefonoEscrito: string, tx?: Transaccion): Promise<TurnoDeLaClienta> {
    const noEsta = noExiste("No encontramos un turno con ese código y ese teléfono. Revisá los dos datos.")
    const telefono = await this.d.clientes.normalizarTelefono(telefonoEscrito)
    if (!telefono) throw noEsta
    const t = await this.d.consultas.deLaClienta(id, telefono, tx, { bloquear: Boolean(tx) })
    if (!t) throw noEsta
    return t
  }

  async buscar(id: number, telefono: string): Promise<EstadoMiTurno> {
    return this.situacion(await this.buscarTurno(id, telefono))
  }

  async cancelar(id: number, telefono: string): Promise<EstadoMiTurno> {
    await this.d.unidad.ejecutar(async (tx) => {
      const s = await this.situacion(await this.buscarTurno(id, telefono, tx))
      if (s.turno.estado === "cancelado") return // ya estaba: no es un error
      if (!s.puedeCancelar) {
        throw conflicto(
          s.fueraDeTermino
            ? `Faltan menos de ${s.horasMinimas} horas para tu turno: para cancelarlo, escribinos por WhatsApp.`
            : "Este turno ya no se puede cancelar.",
        )
      }
      await this.d.turnos.actualizar(id, { estado: "cancelado", canceladoPor: "clienta" }, tx)
    })
    return this.buscar(id, telefono)
  }
}

/** La seña: aplicar un pago, consultarla al volver de Mercado Pago, pedir otro link, vencerlas. */
export class GestionarSenas {
  constructor(private d: TurnosDeps) {}

  /** Lo llaman el aviso de Mercado Pago y la vuelta de la clienta: puede llegar dos veces o tarde. */
  async aplicarPago(turnoId: number, pago: PagoDeSena): Promise<void> {
    if (!pago.aprobado) return
    await this.d.unidad.ejecutar(async (tx) => {
      const t = await this.d.turnos.porId(turnoId, tx, { bloquear: true })
      if (!t) return
      // Si venció, ¿el horario sigue libre? (para recuperarlo)
      const libre =
        t.estado === "cancelado" && t.canceladoPor === "sistema"
          ? !VerificarLugar.sePisa(await this.d.lugar.ocupado(t.fecha, tx, { excluirTurnoId: t.id }), t.horaInicio, t.horaFin)
          : false
      const r = resultadoDelPago(t, pago, libre)
      if (!r.aplicar) return
      await this.d.turnos.actualizar(
        turnoId,
        // canceladoPor solo si cambia: si sigue cancelado, se conserva cuándo se canceló.
        { senaEstado: "pagada", senaPagoId: pago.id, estado: r.estado, ...(r.canceladoPor !== t.canceladoPor ? { canceladoPor: r.canceladoPor } : {}) },
        tx,
      )
      // La seña entra a la caja sola (con el id del pago, así no entra dos veces).
      await this.d.caja.cobrarSena({ turnoId, clienteId: t.clienteId, monto: pago.monto, pagoId: pago.id }, tx)
    })
  }

  /** Al volver de Mercado Pago (que agrega payment_id): si viene el pago, se confirma sin esperar el aviso. */
  async consultar(token: string, pagoId?: string): Promise<TurnoDeLaClienta> {
    const t = await this.d.turnos.porTokenDeSena(token)
    if (!t) throw noExiste("No encontramos ese pago.")
    if (pagoId && t.sena?.estado !== "pagada") {
      const pago = await this.d.pasarela.consultarPago(pagoId)
      // Que el pago sea de ESTE turno: si no, alguien podría usar un pago suyo de otra cosa.
      if (pago.referencia === referenciaDeSena(t.id)) await this.aplicarPago(t.id, pago)
    }
    return (await this.d.consultas.porTokenDeSena(token))!
  }

  async nuevoLink(token: string): Promise<string> {
    const t = await this.d.turnos.porTokenDeSena(token)
    if (!t) throw noExiste("No encontramos ese pago.")
    if (t.sena?.estado !== "pendiente" || t.estado !== "reservado" || t.senaVencida) {
      throw conflicto("Esta seña ya no se puede pagar. Si querés el turno, reservalo de nuevo.")
    }
    const s = await this.d.servicios.reservable(t.servicioId, { incluirPausados: true })
    return this.d.pasarela.crearLink({ turnoId: t.id, servicio: s.nombre, fecha: t.fecha, hora: t.horaInicio, monto: t.sena.monto, token: t.sena.token })
  }

  /** El % que se cobra de verdad: 0 si la pasarela no está conectada (la web lo muestra). */
  async porcentaje(): Promise<number> {
    return (await this.d.pasarela.conectada()) ? this.d.configuracion.porcentajeSena() : 0
  }

  /** Cancela los turnos cuya seña venció sin pagar. Corre cada minuto (index.ts). */
  vencer(): Promise<number> {
    return this.d.turnos.vencerSenas()
  }
}
