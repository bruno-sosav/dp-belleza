/** Lo que SALE por HTTP de gift cards. El código solo lo ven la dueña y quien la pagó. */
import { mostrarCodigo, type GiftCard, type Movimiento } from "../models/giftCard.model.js"

/** Al volver de Mercado Pago: el código aparece recién cuando está pagada. */
export const aGiftCardPublica = (g: GiftCard) => ({
  estado: g.estado,
  monto: g.monto,
  para: g.para,
  mensaje: g.mensaje,
  codigo: g.estado === "activa" ? mostrarCodigo(g.codigo) : null,
})

export const aSaldo = (s: { codigo: string; saldo: number }) => ({ codigo: mostrarCodigo(s.codigo), saldo: s.saldo })

export const aCompraWeb = (c: { pagoToken: string }) => ({ pagoToken: c.pagoToken })

export const aLinkDePago = (link: string) => ({ link })

/** En la lista y el detalle del panel. */
export const aGiftCard = (g: GiftCard) => ({
  id: g.id,
  codigo: mostrarCodigo(g.codigo),
  monto: g.monto,
  saldo: g.saldo,
  estado: g.estado,
  origen: g.origen,
  comprador: g.comprador,
  para: g.para,
  mensaje: g.mensaje,
  activadaAt: g.activadaAt,
  creadaEn: g.creadaEn,
})

const aMovimiento = (m: Movimiento) => ({
  id: m.id,
  fechaHora: m.fechaHora,
  tipo: m.tipo,
  monto: m.monto,
  saldoDespues: m.saldoDespues,
  pedidoId: m.pedidoId,
  descripcion: m.descripcion,
})

export const aGiftCardDetalle = (g: GiftCard & { movimientos: Movimiento[] }) => ({ ...aGiftCard(g), movimientos: g.movimientos.map(aMovimiento) })
