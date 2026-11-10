/** Lo que SALE por HTTP de shipping. */
import type { Cotizacion, Envio, EventoDeSeguimiento } from "../models/envio.model.js"
import type { ResumenCuentaAndreani } from "../models/envios.ports.js"

export const aCotizacion = (c: Cotizacion) => ({ costo: c.costo, plazoDias: c.plazoDias, gratis: c.gratis, prueba: c.proveedor === "prueba" })

export const aEnvio = (e: Envio) => ({
  calle: e.calle,
  ciudad: e.ciudad,
  provincia: e.provincia,
  codigoPostal: e.codigoPostal,
  costo: e.costo,
  plazoDias: e.plazoDias,
  proveedor: e.proveedor,
  estado: e.estado,
  numeroSeguimiento: e.numeroSeguimiento,
  despachadoAt: e.despachadoAt,
})

export const aEvento = (e: EventoDeSeguimiento) => ({ fecha: e.fecha, estado: e.estado, detalle: e.detalle })

/** Nunca la contraseña. */
export const aCuentaAndreani = (c: ResumenCuentaAndreani | null) => (c ? { usuario: c.usuario, cliente: c.cliente, contrato: c.contrato, entorno: c.entorno, verificadaAt: c.verificadaAt } : null)
