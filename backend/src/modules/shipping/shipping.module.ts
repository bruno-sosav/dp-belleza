/**
 * Módulo de envíos (shipping): cotiza, guarda, despacha y sigue los envíos de
 * la tienda, con Andreani o con el simulador del modo prueba. Raíz de
 * composición: exporta solo lo que el resto del sistema puede usar.
 */
import type { Transaccion } from "../../core/transaccion.port.js"
import type { Cotizacion, Direccion } from "./models/envio.model.js"
import { ConfigurarAndreani, CotizarEnvio, ElegirTransportista, EnviosDePedidos } from "./services/envios.usecases.js"
import { MySqlEnvioRepository } from "./repositories/envio.repository.js"
import { MySqlCuentaAndreaniRepository } from "./repositories/cuentaAndreani.repository.js"
import { TransportistaDePrueba } from "./integrations/prueba.transportista.js"
import { TransportistaAndreani, loginAndreani } from "./integrations/andreani.gateway.js"
import { ajustesDeEnvio } from "./integrations/ajustes.adapter.js"
import { EnviosController } from "./controllers/envios.controller.js"
import { rutasPanelEnvios, rutasWebEnvios } from "./controllers/envios.routes.js"

const repo = new MySqlEnvioRepository()
const cuentas = new MySqlCuentaAndreaniRepository()
const elegir = new ElegirTransportista(ajustesDeEnvio, new TransportistaDePrueba(), new TransportistaAndreani(cuentas, ajustesDeEnvio), cuentas)
const cotizar = new CotizarEnvio(elegir)
const dePedidos = new EnviosDePedidos(repo, elegir, ajustesDeEnvio)
const controller = new EnviosController(cotizar, new ConfigurarAndreani(cuentas, loginAndreani))

export type { Cotizacion, Direccion }
export type { Envio, EventoDeSeguimiento } from "./models/envio.model.js"
/** Para validar la dirección donde la reciba otro módulo (el checkout de orders). */
export { direccionDeEnvio } from "./schemas/envios.schema.js"

/** Lo que shipping ofrece al resto del sistema. */
export const envios = {
  /** Cotizar desde la web: se monta bajo /api/tienda. */
  rutasWeb: rutasWebEnvios(controller),
  /** Cuenta de Andreani: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasPanelEnvios(controller),

  cotizar: (d: { codigoPostal: string; unidades: number; subtotal: number }) => cotizar.ejecutar(d),
  registrar: (pedidoId: number, destino: Direccion, c: Cotizacion, tx: Transaccion) => dePedidos.registrar(pedidoId, destino, c, tx),
  delPedido: (pedidoId: number) => dePedidos.porPedido(pedidoId),
  despachar: (d: Parameters<EnviosDePedidos["despachar"]>[0]) => dePedidos.despachar(d),
  seguimiento: (pedidoId: number) => dePedidos.seguimiento(pedidoId),
  marcarEntregado: (pedidoId: number, tx: Transaccion) => dePedidos.marcarEntregado(pedidoId, tx),
}
