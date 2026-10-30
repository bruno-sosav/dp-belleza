/** Raíz de composición de pagos: caja y Mercado Pago. Turnos y pedidos se enchufan con `conectarTurnos` y `conectarPedidos`. */
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import { relojDelSistema } from "../../core/reloj.port.js"
import type { Transaccion } from "../../core/transaccion.port.js"
import { AnotarCobro, BorrarCobro, CobrosDePedidos, CobrosDeTurnos, VerCaja, type ConexionConPedidos, type ConexionConTurnos } from "./services/caja.usecases.js"
import { CobrarConMercadoPago, ConfigurarMercadoPago, RecibirAvisoDePago } from "./services/mercadoPago.usecases.js"
import type { MedioPago } from "./models/cobro.model.js"
import type { PasarelaDePago, PedidosDeLaCaja, TurnosDeLaCaja } from "./models/pagos.ports.js"
import { MercadoPagoApi } from "./integrations/mercadoPago.gateway.js"
import { MySqlCobroRepository } from "./repositories/cobro.repository.js"
import { MySqlConsultasDeCaja } from "./repositories/caja.queries.js"
import { MySqlCuentaRepository } from "./repositories/cuentaMercadoPago.repository.js"
import { MySqlPagosRecibidos } from "./repositories/pagoRecibido.repository.js"
import { PagosController } from "./controllers/pagos.controller.js"
import { rutasPagosPanel, rutasPagosWeb } from "./controllers/pagos.routes.js"

const cobros = new MySqlCobroRepository()
const cuentas = new MySqlCuentaRepository()
const pasarela = new MercadoPagoApi()
const turnos: ConexionConTurnos = { actual: null }
const pedidos: ConexionConPedidos = { actual: null }

const cobrosDeTurnos = new CobrosDeTurnos(cobros)
const cobrosDePedidos = new CobrosDePedidos(cobros)
const mercadoPago = new CobrarConMercadoPago(cuentas, pasarela)
const controller = new PagosController(
  {
    verCaja: new VerCaja(new MySqlConsultasDeCaja()),
    anotarCobro: new AnotarCobro(cobros, turnos, unidadDeTrabajoMySql),
    borrarCobro: new BorrarCobro(cobros),
    cuenta: new ConfigurarMercadoPago(cuentas, pasarela),
    avisos: new RecibirAvisoDePago(cuentas, pasarela, new MySqlPagosRecibidos(), turnos, pedidos),
  },
  relojDelSistema,
)

/** Lo que pagos ofrece al resto del sistema. */
export const pagos = {
  /** El aviso de Mercado Pago y "¿se pagó?": se montan bajo /api/mercadopago. */
  rutasWeb: rutasPagosWeb(controller),
  /** Caja y Ajustes → Mercado Pago: se montan bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPagosPanel(controller),

  /** El módulo de turnos se conecta al arrancar (ver appointments.module.ts). */
  conectarTurnos: (t: TurnosDeLaCaja) => {
    turnos.actual = t
  },

  /** El módulo de pedidos se conecta al arrancar (ver orders.module.ts). */
  conectarPedidos: (p: PedidosDeLaCaja) => {
    pedidos.actual = p
  },

  // ----- la caja, para pedidos de la tienda
  cobrarPedido: (c: { pedidoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion) => cobrosDePedidos.mercadoPago(c, tx),

  // ----- la caja, para turnos
  cobrarTurno: (c: { turnoId: number; clienteId: number; monto: number; medio: MedioPago }, tx: Transaccion) => cobrosDeTurnos.alTerminar(c, tx),
  cobrarSena: (c: { turnoId: number; clienteId: number; monto: number; pagoId: number }, tx: Transaccion) => cobrosDeTurnos.sena(c, tx),
  anularCobroDelTurno: (turnoId: number, tx: Transaccion) => cobrosDeTurnos.anular(turnoId, tx),
  /** Cuánto entró por cada turno (seña + lo cobrado al terminar). */
  cobradoPorTurnos: (turnoIds: number[]) => cobrosDeTurnos.cobrado(turnoIds),
  /** Al unir dos fichas de clienta (customers). */
  reasignarCliente: (deId: number, aId: number, tx: Transaccion) => cobros.reasignarCliente(deId, aId, tx),

  // ----- Mercado Pago, para quien cobre con él
  mercadoPagoConectado: () => mercadoPago.conectada(),
  publicKey: () => mercadoPago.publicKey(),
  crearLinkDePago: (d: Parameters<PasarelaDePago["crearLink"]>[1]) => mercadoPago.crearLink(d),
  consultarPago: (id: string | number) => mercadoPago.consultarPago(id),
}

export type { PagoRecibido } from "./models/mercadoPago.model.js"
export type { MedioPago } from "./models/cobro.model.js"
