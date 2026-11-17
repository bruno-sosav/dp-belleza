/** Cotizar el envío: GET /api/tienda/envios/cotizar (envios.controller.ts). El backend lo recalcula al comprar. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type Cotizacion = {
  costo: number
  /** Días hábiles estimados. null si el transportista no lo informa. */
  plazoDias: number | null
  gratis: boolean
  /** true en el modo prueba: tarifas simuladas, no de Andreani. */
  prueba: boolean
}

/** Mismo criterio que el backend: 4 números, o el CPA nuevo (B7600FDA → 7600). null si todavía no es un CP. */
export function cpValido(texto: string): string | null {
  const limpio = texto.trim().toUpperCase().replace(/\s+/g, "")
  const cpa = /^[A-Z](\d{4})[A-Z]{3}$/.exec(limpio)
  if (cpa) return cpa[1]
  return /^\d{4}$/.test(limpio) && limpio !== "0000" ? limpio : null
}

/** La cotización de un CP, o null mientras no haya un CP válido. */
export function useCotizacionEnvio(cp: string | null, unidades: number, subtotal: number) {
  const pedir = useCallback(
    () => (cp ? api<Cotizacion>("/api/tienda/envios/cotizar", { query: { cp, unidades, subtotal } }) : Promise.resolve(null)),
    [cp, unidades, subtotal],
  )
  return useApi(pedir)
}

/**
 * El envío del checkout: el CP válido, la cotización y cuánto suma al total.
 * `costo` null = todavía sin cotizar (no se puede confirmar); 0 si retira o es gratis.
 */
export function useEnvioDelCheckout(conEnvio: boolean, codigoPostal: string, unidades: number, subtotal: number) {
  const cp = conEnvio ? cpValido(codigoPostal) : null
  const cotizacion = useCotizacionEnvio(cp, unidades, subtotal)
  const costo = conEnvio ? (cotizacion.data?.costo ?? null) : 0
  return { cp, cotizacion, costo, falta: costo === null }
}

export const PROVINCIAS = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const
