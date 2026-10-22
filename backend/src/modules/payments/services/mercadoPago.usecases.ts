/** Casos de uso de Mercado Pago: la cuenta del local, cobrar, y los avisos de pago. */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import { destinoDelPago, firmaValida, modoDeLaCuenta, problemaDeCredenciales, type PagoRecibido } from "../models/mercadoPago.model.js"
import type { CuentaRepository, PagosRecibidosRepository, PasarelaDePago } from "../models/pagos.ports.js"
import { turnosConectados, type ConexionConTurnos } from "./caja.usecases.js"

const SIN_CUENTA = "Mercado Pago no está configurado. Cargá las credenciales en Ajustes → Mercado Pago."

/**
 * Ajustes → Mercado Pago. Antes de guardar se prueban las credenciales: si el
 * token no sirve no se guarda, así no queda una configuración rota que recién
 * se descubre al cobrar.
 */
export class ConfigurarMercadoPago {
  constructor(
    private cuentas: CuentaRepository,
    private pasarela: PasarelaDePago,
  ) {}

  estado() {
    return this.cuentas.resumen()
  }

  private async verificar(accessToken: string) {
    const u = await this.pasarela.usuario(accessToken)
    return { modo: modoDeLaCuenta(accessToken, u.nickname), cuenta: [u.nickname, u.email].filter(Boolean).join(" · ") }
  }

  async guardar(d: { accessToken: string; publicKey: string; webhookSecret?: string }) {
    const problema = problemaDeCredenciales(d.accessToken, d.publicKey)
    if (problema) throw invalido(problema)
    const { modo, cuenta } = await this.verificar(d.accessToken)
    await this.cuentas.guardar({ accessToken: d.accessToken, publicKey: d.publicKey, webhookSecret: d.webhookSecret ?? null, modo, cuenta })
    return this.cuentas.resumen()
  }

  /** Vuelve a probar las credenciales guardadas. */
  async probar() {
    const c = await this.cuentas.leer()
    if (!c) throw noEncontrado("Configuración de Mercado Pago")
    const { modo, cuenta } = await this.verificar(c.accessToken)
    await this.cuentas.marcarVerificada(modo, cuenta)
    return this.cuentas.resumen()
  }

  desconectar() {
    return this.cuentas.borrar()
  }
}

/** Cobrar con Mercado Pago (lo usan otros módulos: la seña de los turnos). */
export class CobrarConMercadoPago {
  constructor(
    private cuentas: CuentaRepository,
    private pasarela: PasarelaDePago,
  ) {}

  async conectada(): Promise<boolean> {
    return (await this.cuentas.leer()) !== null
  }

  /** La Public Key es pública por diseño (va en el navegador). null si no hay cuenta. */
  async publicKey(): Promise<string | null> {
    return (await this.cuentas.resumen())?.publicKey ?? null
  }

  private async cuenta() {
    const c = await this.cuentas.leer()
    if (!c) throw conflicto(SIN_CUENTA)
    return c
  }

  /** Un link de pago (Checkout Pro) para mandar a la clienta. */
  async crearLink(d: Parameters<PasarelaDePago["crearLink"]>[1]): Promise<string> {
    return this.pasarela.crearLink(await this.cuenta(), d)
  }

  async consultarPago(id: string | number): Promise<PagoRecibido> {
    return (await this.pasarela.consultarPago(await this.cuenta(), id)).pago
  }
}

export type ResultadoDelAviso = "ignorado" | "sin_cuenta" | "firma_invalida" | "procesado"

/**
 * El aviso (webhook) de Mercado Pago. No se confía en lo que trae: solo se
 * toma el id del pago y se lo consulta con el token del local. Si hay clave
 * secreta cargada, se rechaza lo que no venga firmado.
 */
export class RecibirAvisoDePago {
  constructor(
    private cuentas: CuentaRepository,
    private pasarela: PasarelaDePago,
    private recibidos: PagosRecibidosRepository,
    private turnos: ConexionConTurnos,
  ) {}

  async ejecutar(a: { tipo: string; dataId: string; firma?: string; requestId?: string }): Promise<ResultadoDelAviso> {
    if (a.tipo !== "payment" || !/^\d+$/.test(a.dataId)) return "ignorado"
    const cuenta = await this.cuentas.leer()
    if (!cuenta) return "sin_cuenta"
    if (cuenta.webhookSecret && !firmaValida(cuenta.webhookSecret, a.firma, a.requestId, a.dataId)) return "firma_invalida"

    const { pago, datos } = await this.pasarela.consultarPago(cuenta, a.dataId)
    await this.recibidos.guardar(pago, datos)
    // A quién le toca: "turno-<id>" es la seña de un turno. (Los pedidos de la tienda todavía no se cobran con Mercado Pago.)
    const destino = destinoDelPago(pago.referencia)
    if (destino?.tipo === "turno") await turnosConectados(this.turnos).aplicarPagoSena(destino.id, pago)
    return "procesado"
  }

  /** Para que la web muestre "¡pago aprobado!" al volver de Mercado Pago. */
  estado(referencia: string) {
    return this.recibidos.ultimoEstado(referencia)
  }
}
