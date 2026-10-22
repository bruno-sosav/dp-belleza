/** Lo que SALE por HTTP de pagos: solo lo que usan las pantallas de Caja y de Mercado Pago. */
import type { ResumenCuenta } from "../models/mercadoPago.model.js"
import type { CobroEnCaja, TurnoSinCobrar } from "../models/pagos.ports.js"
import type { VerCaja } from "../services/caja.usecases.js"
import type { ResultadoDelAviso } from "../services/mercadoPago.usecases.js"

const aCobro = (c: CobroEnCaja) => ({
  id: c.id,
  fechaHora: c.fechaHora,
  monto: c.monto,
  medio: c.medio,
  concepto: c.concepto,
  descripcion: c.descripcion,
  turno: c.turno ? { id: c.turno.id, servicio: c.turno.servicio, fecha: c.turno.fecha, hora: c.turno.hora } : null,
  cliente: c.cliente ? { nombre: c.cliente.nombre } : null,
})

const aSinCobrar = (t: TurnoSinCobrar) => ({
  turnoId: t.turnoId,
  hora: t.hora,
  servicio: t.servicio,
  cliente: { nombre: t.cliente.nombre },
  precio: t.precio,
  cobrado: t.cobrado,
  falta: t.precio - t.cobrado,
})

export const aDiaDeCaja = (d: Awaited<ReturnType<VerCaja["ejecutar"]>>) => ({
  fecha: d.fecha,
  cobros: d.cobros.map(aCobro),
  totales: d.totales,
  sinCobrar: d.sinCobrar.map(aSinCobrar),
})

/** Las credenciales nunca vuelven enteras: si está conectada, la cuenta, el modo y los últimos 4 del token. */
export const aEstadoMercadoPago = (r: ResumenCuenta | null) =>
  r
    ? {
        configurada: true as const,
        modo: r.modo,
        cuenta: r.cuenta,
        publicKey: r.publicKey,
        tokenFinal: r.tokenFinal,
        webhookSecretCargado: r.webhookSecretCargado,
        verificadaAt: r.verificadaAt,
      }
    : { configurada: false as const }

/**
 * La respuesta al aviso de Mercado Pago: el código HTTP importa (con 200 no
 * reintenta). Lo que no es nuestro se contesta 200 para que no insista.
 */
export const aRespuestaDelAviso = (r: ResultadoDelAviso): { status: number; cuerpo: object } => {
  if (r === "ignorado") return { status: 200, cuerpo: { ignorado: true } }
  if (r === "sin_cuenta") return { status: 503, cuerpo: { error: "Mercado Pago no está configurado" } }
  if (r === "firma_invalida") return { status: 401, cuerpo: { error: "Firma inválida" } }
  return { status: 200, cuerpo: { ok: true } }
}

/** "¿Se pagó?" al volver de Mercado Pago: solo el estado (approved, pending…), o null. */
export const aEstadoDePago = (estado: string | null) => ({ estado })
