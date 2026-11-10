/** Casos de uso de los envíos. Sin SQL ni Express. El transportista sale de Ajustes → Envíos. */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import { armarBulto, conEnvioGratis, normalizarCP, sePuedeDespachar, type Cotizacion, type Direccion, type Envio, type EventoDeSeguimiento } from "../models/envio.model.js"
import type { AjustesDeEnvio, CuentaAndreani, CuentaAndreaniRepository, EnvioRepository, FuenteDeAjustes, Transportista } from "../models/envios.ports.js"

const SIN_ENVIOS = "Por ahora no hacemos envíos: podés retirar tu pedido en el local."

/** El transportista de cada modo. Andreani se elige solo si el local cargó la cuenta. */
export class ElegirTransportista {
  constructor(
    private ajustes: FuenteDeAjustes,
    private prueba: Transportista,
    private andreani: Transportista,
    private cuentas: CuentaAndreaniRepository,
  ) {}

  async ejecutar(): Promise<{ transportista: Transportista; ajustes: AjustesDeEnvio }> {
    const ajustes = await this.ajustes.leer()
    if (ajustes.modo === "desactivado") throw conflicto(SIN_ENVIOS)
    if (ajustes.modo === "andreani" && !(await this.cuentas.leer())) throw conflicto(SIN_ENVIOS)
    return { transportista: ajustes.modo === "andreani" ? this.andreani : this.prueba, ajustes }
  }

  /** Para el seguimiento de un envío ya hecho: el transportista con el que se despachó. */
  delEnvio(e: Pick<Envio, "proveedor">): Transportista {
    return e.proveedor === "andreani" ? this.andreani : this.prueba
  }
}

/** Cuánto sale mandar `unidades` productos por `subtotal` a un código postal. */
export class CotizarEnvio {
  constructor(private elegir: ElegirTransportista) {}

  async ejecutar(d: { codigoPostal: string; unidades: number; subtotal: number }): Promise<Cotizacion> {
    const cp = normalizarCP(d.codigoPostal)
    if (!cp) throw invalido("El código postal tiene 4 números (por ejemplo, 7600).")
    const { transportista, ajustes } = await this.elegir.ejecutar()
    const tarifa = await transportista.cotizar(ajustes.cpOrigen, cp, armarBulto(d.unidades, ajustes.pesoUnidadG, d.subtotal))
    return conEnvioGratis(tarifa, d.subtotal, ajustes.gratisDesde, transportista.proveedor)
  }
}

/** Lo que hace orders con el envío de un pedido: guardarlo, despacharlo, seguirlo y cerrarlo. */
export class EnviosDePedidos {
  constructor(
    private envios: EnvioRepository,
    private elegir: ElegirTransportista,
    private ajustes: FuenteDeAjustes,
  ) {}

  registrar(pedidoId: number, destino: Direccion, cotizacion: Cotizacion, tx: Transaccion) {
    const codigoPostal = normalizarCP(destino.codigoPostal)
    if (!codigoPostal) throw invalido("El código postal tiene 4 números (por ejemplo, 7600).")
    return this.envios.registrar(
      { pedidoId, ...destino, codigoPostal, costo: cotizacion.costo, plazoDias: cotizacion.plazoDias, proveedor: cotizacion.proveedor },
      tx,
    )
  }

  porPedido(pedidoId: number) {
    return this.envios.porPedido(pedidoId)
  }

  /** Genera el envío con el transportista. Solo un pedido confirmado y una vez. */
  async despachar(d: {
    pedidoId: number
    estadoPedido: string
    destinatario: { nombre: string; telefono: string; email: string | null }
    unidades: number
    valor: number
  }): Promise<Envio> {
    const envio = await this.envios.porPedido(d.pedidoId)
    if (!envio) throw noEncontrado("Envío")
    if (!sePuedeDespachar(d.estadoPedido, envio)) {
      throw conflicto(envio.estado !== "a_despachar" ? "Este envío ya se despachó." : "Confirmá el pedido antes de despachar el envío.")
    }
    const { pesoUnidadG, cpOrigen } = await this.ajustes.leer()
    const { numero } = await this.elegir.delEnvio(envio).despachar(cpOrigen, {
      pedidoId: d.pedidoId,
      destino: envio,
      destinatario: d.destinatario,
      bulto: armarBulto(d.unidades, pesoUnidadG, d.valor),
    })
    await this.envios.marcarDespachado(d.pedidoId, numero)
    return (await this.envios.porPedido(d.pedidoId))!
  }

  async seguimiento(pedidoId: number): Promise<EventoDeSeguimiento[]> {
    const envio = await this.envios.porPedido(pedidoId)
    if (!envio) throw noEncontrado("Envío")
    if (!envio.numeroSeguimiento) return []
    return this.elegir.delEnvio(envio).seguimiento(envio.numeroSeguimiento, envio.despachadoAt)
  }

  marcarEntregado(pedidoId: number, tx: Transaccion) {
    return this.envios.marcarEntregado(pedidoId, tx)
  }
}

/** Ajustes → Envíos → cuenta de Andreani: se prueba el login antes de guardar. */
export class ConfigurarAndreani {
  constructor(
    private cuentas: CuentaAndreaniRepository,
    private login: (c: CuentaAndreani) => Promise<unknown>,
  ) {}

  estado() {
    return this.cuentas.resumen()
  }

  async guardar(c: CuentaAndreani) {
    await this.login(c)
    await this.cuentas.guardar(c)
    await this.cuentas.marcarVerificada()
    return this.cuentas.resumen()
  }

  desconectar() {
    return this.cuentas.borrar()
  }
}
