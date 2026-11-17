/** Puertos de gift cards. Las implementaciones están en repositories/ (MySQL) e integrations/ (otros módulos). */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { EstadoGiftCard, GiftCard, Movimiento, Origen, PagoDeGiftCard, TipoMovimiento } from "./giftCard.model.js"

export type NuevaGiftCard = {
  codigo: string
  monto: number
  estado: Extract<EstadoGiftCard, "pendiente_pago" | "activa">
  origen: Origen
  comprador: { nombre: string; telefono: string | null; email: string | null }
  para: string | null
  mensaje: string | null
  pagoToken: string | null
}

export type NuevoMovimiento = {
  giftCardId: number
  tipo: TipoMovimiento
  monto: number
  saldoDespues: number
  pedidoId?: number | null
  descripcion?: string | null
}

export type FiltrosGiftCards = { estado?: EstadoGiftCard; busqueda?: string }

/** Las tablas `gift_cards` y `gift_card_movimientos`: el único lugar que las escribe. */
export interface GiftCardRepository {
  crear(g: NuevaGiftCard, tx?: Transaccion): Promise<number>
  /** Con `tx` la bloquea hasta el final de la transacción (dos compras no gastan el mismo saldo). */
  porId(id: number, tx?: Transaccion): Promise<GiftCard | null>
  porCodigo(codigo: string, tx?: Transaccion): Promise<GiftCard | null>
  idPorToken(token: string): Promise<number | null>
  /** Pagada: queda activa con todo el saldo. */
  activar(id: number, pagoId: number | null, tx: Transaccion): Promise<void>
  cambiarSaldo(id: number, saldo: number, tx: Transaccion): Promise<void>
  anular(id: number, tx: Transaccion): Promise<void>
  movimiento(m: NuevoMovimiento, tx: Transaccion): Promise<void>
  movimientos(id: number): Promise<Movimiento[]>
  listar(filtros: FiltrosGiftCards): Promise<GiftCard[]>
}

/** La caja: el módulo payments. Lo que se cobra al vender una gift card. */
export interface CajaDeGiftCards {
  cobrarVenta(c: { giftCardId: number; monto: number; medio: string; pagoId?: number; descripcion: string }, tx: Transaccion): Promise<void>
}

/** Mercado Pago: el módulo payments. */
export interface PasarelaDeGiftCards {
  conectada(): Promise<boolean>
  crearLink(d: { giftCardId: number; token: string; monto: number }): Promise<string>
  consultarPago(id: string): Promise<PagoDeGiftCard>
}

/** Teléfonos como los guarda customers (549…), para que el link de WhatsApp funcione. null si no parece válido. */
export type NormalizarTelefono = (texto: string) => Promise<string | null>

/** Bytes al azar para códigos y tokens (crypto en producción, fijos en los tests). */
export type Azar = (n: number) => Uint8Array
