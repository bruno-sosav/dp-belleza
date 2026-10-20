/**
 * Módulo de pagos (payments). Raíz de composición: crea las implementaciones
 * concretas, las inyecta en los casos de uso y exporta solo lo que el resto
 * del sistema puede usar.
 *
 * Tiene la CAJA (los cobros) y MERCADO PAGO (la cuenta del local, los links de
 * pago y los avisos). No depende de turnos: es turnos quien se conecta acá
 * (`conectarTurnos`), así no hay dependencias en círculo.
 */
import { unidadDeTrabajoMySql } from "../../core/database/MySqlUnidadDeTrabajo.js"
import { relojDelSistema } from "../../core/reloj.js"
import type { Transaccion } from "../../core/transaccion.js"
import { AnotarCobro, BorrarCobro, CobrosDeTurnos, VerCaja, type ConexionConTurnos } from "./application/caja.js"
import { CobrarConMercadoPago, ConfigurarMercadoPago, RecibirAvisoDePago } from "./application/mercadoPago.js"
import type { MedioPago } from "./domain/cobro.js"
import type { PasarelaDePago, TurnosDeLaCaja } from "./domain/payments.ports.js"
import { MercadoPagoApi } from "./infrastructure/MercadoPagoApi.js"
import { MySqlCobroRepository } from "./infrastructure/MySqlCobroRepository.js"
import { MySqlConsultasDeCaja } from "./infrastructure/MySqlConsultasDeCaja.js"
import { MySqlCuentaRepository } from "./infrastructure/MySqlCuentaRepository.js"
import { MySqlPagosRecibidos } from "./infrastructure/MySqlPagosRecibidos.js"
import { PagosController } from "./presentation/controllers/payments.controller.js"
import { rutasPagosPanel, rutasPagosWeb } from "./presentation/routes/payments.routes.js"

const cobros = new MySqlCobroRepository()
const cuentas = new MySqlCuentaRepository()
const pasarela = new MercadoPagoApi()
const turnos: ConexionConTurnos = { actual: null }

const cobrosDeTurnos = new CobrosDeTurnos(cobros)
const mercadoPago = new CobrarConMercadoPago(cuentas, pasarela)
const controller = new PagosController(
  {
    verCaja: new VerCaja(new MySqlConsultasDeCaja()),
    anotarCobro: new AnotarCobro(cobros, turnos, unidadDeTrabajoMySql),
    borrarCobro: new BorrarCobro(cobros),
    cuenta: new ConfigurarMercadoPago(cuentas, pasarela),
    avisos: new RecibirAvisoDePago(cuentas, pasarela, new MySqlPagosRecibidos(), turnos),
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

export type { PagoRecibido } from "./domain/mercadoPago.js"
export type { MedioPago } from "./domain/cobro.js"
