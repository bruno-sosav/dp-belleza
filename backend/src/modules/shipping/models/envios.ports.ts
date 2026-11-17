/** Puertos de shipping. Implementaciones: repositories/ (MySQL) e integrations/ (Andreani, simulador, ajustes). */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Bulto, Direccion, Envio, EventoDeSeguimiento, Proveedor } from "./envio.model.js"

/** La tabla `envios`: el único lugar que la escribe. */
export interface EnvioRepository {
  registrar(e: Omit<Envio, "estado" | "numeroSeguimiento" | "despachadoAt">, tx: Transaccion): Promise<void>
  porPedido(pedidoId: number, tx?: Transaccion): Promise<Envio | null>
  marcarDespachado(pedidoId: number, numero: string): Promise<void>
  marcarEntregado(pedidoId: number, tx?: Transaccion): Promise<void>
}

/** La cuenta de la API de Andreani del local (contraseña cifrada en la base). */
export type CuentaAndreani = { usuario: string; password: string; cliente: string; contrato: string; entorno: "qa" | "produccion" }
export type ResumenCuentaAndreani = { usuario: string; cliente: string; contrato: string; entorno: "qa" | "produccion"; verificadaAt: string | null }

export interface CuentaAndreaniRepository {
  leer(): Promise<CuentaAndreani | null>
  resumen(): Promise<ResumenCuentaAndreani | null>
  guardar(c: CuentaAndreani): Promise<void>
  marcarVerificada(): Promise<void>
  borrar(): Promise<void>
}

/** Cómo envía la tienda: lo que cargó la dueña en Ajustes → Envíos (módulo admin). */
export type AjustesDeEnvio = { modo: "desactivado" | "prueba" | "andreani"; gratisDesde: number; cpOrigen: string; pesoUnidadG: number }
export interface FuenteDeAjustes {
  leer(): Promise<AjustesDeEnvio>
  /** Para despachar: de dónde sale el paquete y quién lo manda. */
  remitente(): Promise<{ nombre: string; direccion: string; email: string; telefono: string }>
}

/** Quien manda el paquete: el destino, la clienta y el paquete. */
export type DatosDeDespacho = {
  pedidoId: number
  destino: Direccion
  destinatario: { nombre: string; telefono: string; email: string | null }
  bulto: Bulto
}

/** Un transportista: Andreani de verdad o el simulador del modo prueba. */
export interface Transportista {
  readonly proveedor: Proveedor
  cotizar(cpOrigen: string, cpDestino: string, bulto: Bulto): Promise<{ costo: number; plazoDias: number | null }>
  /** Genera el envío y devuelve el número de seguimiento. */
  despachar(cpOrigen: string, d: DatosDeDespacho): Promise<{ numero: string }>
  seguimiento(numero: string, despachadoAt: string | null): Promise<EventoDeSeguimiento[]>
}
