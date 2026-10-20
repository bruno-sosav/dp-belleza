/** Lo que SALE por HTTP de pagos: solo lo que usan las pantallas de Caja y de Mercado Pago. */
import type { ResumenCuenta } from "../domain/mercadoPago.js"
import type { CobroEnCaja, TurnoSinCobrar } from "../domain/payments.ports.js"
import type { VerCaja } from "../application/caja.js"

const aCobro = (c: CobroEnCaja) => ({
  id: c.id,
  fechaHora: c.fechaHora,
  monto: c.monto,
  medio: c.medio,
  concepto: c.concepto,
  descripcion: c.descripcion,
  turno: c.turno,
  cliente: c.cliente,
})

const aSinCobrar = (t: TurnoSinCobrar) => ({ ...t, falta: t.precio - t.cobrado })

export const aDiaDeCaja = (d: Awaited<ReturnType<VerCaja["ejecutar"]>>) => ({
  fecha: d.fecha,
  cobros: d.cobros.map(aCobro),
  totales: d.totales,
  sinCobrar: d.sinCobrar.map(aSinCobrar),
})

/** Las credenciales nunca vuelven enteras: si está conectada, la cuenta, el modo y los últimos 4 del token. */
export const aEstadoMercadoPago = (r: ResumenCuenta | null) => (r ? { configurada: true as const, ...r } : { configurada: false as const })
