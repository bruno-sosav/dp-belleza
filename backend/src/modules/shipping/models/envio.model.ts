/**
 * Envíos de la tienda. Dominio puro: tipos y reglas, sin base de datos ni HTTP.
 * La tarifa la da el transportista (Andreani, o el simulador en modo prueba);
 * acá se decide si es gratis, se arma el bulto y se valida la dirección.
 */

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

export type Direccion = { calle: string; ciudad: string; provincia: string; codigoPostal: string }

export type Proveedor = "andreani" | "prueba"
export type EstadoEnvio = "a_despachar" | "despachado" | "entregado"

/** Lo que cuesta mandar un pedido a un código postal. */
export type Cotizacion = { costo: number; plazoDias: number | null; gratis: boolean; proveedor: Proveedor }

export type Envio = Direccion & {
  pedidoId: number
  costo: number
  plazoDias: number | null
  proveedor: Proveedor
  estado: EstadoEnvio
  numeroSeguimiento: string | null
  despachadoAt: string | null
}

/** Un paquete, como lo piden los transportistas para cotizar y despachar. */
export type Bulto = { kilos: number; volumenCm3: number; valorDeclarado: number }

/** Un paso del seguimiento ("En distribución", "Entregado"…). */
export type EventoDeSeguimiento = { fecha: string; estado: string; detalle: string | null }

/**
 * Código postal de 4 números. Acepta el CPA nuevo (B7600FDA → 7600) y espacios.
 * null si no parece un código postal argentino.
 */
export function normalizarCP(texto: string): string | null {
  const limpio = texto.trim().toUpperCase().replace(/\s+/g, "")
  const cpa = /^[A-Z](\d{4})[A-Z]{3}$/.exec(limpio)
  if (cpa) return cpa[1]
  return /^\d{4}$/.test(limpio) && limpio !== "0000" ? limpio : null
}

/** Un bulto por pedido: el peso sale de las unidades; el volumen, de una caja chica por unidad. */
export function armarBulto(unidades: number, pesoUnidadG: number, valorDeclarado: number): Bulto {
  const kilos = Math.max(0.1, Math.round((unidades * pesoUnidadG) / 100) / 10)
  return { kilos, volumenCm3: Math.max(1000, unidades * 1000), valorDeclarado }
}

/** Desde cierto monto de productos el envío no se cobra (0 = nunca es gratis). */
export function conEnvioGratis(tarifa: { costo: number; plazoDias: number | null }, subtotal: number, gratisDesde: number, proveedor: Proveedor): Cotizacion {
  const gratis = gratisDesde > 0 && subtotal >= gratisDesde
  return { costo: gratis ? 0 : Math.round(tarifa.costo), plazoDias: tarifa.plazoDias, gratis, proveedor }
}

/**
 * Tarifa del modo prueba: imita lo que cobraría Andreani según la distancia
 * (primer dígito del CP, que agrupa regiones) y el peso. Solo para desarrollo y la demo.
 */
export function tarifaDePrueba(cpOrigen: string, cpDestino: string, kilos: number): { costo: number; plazoDias: number } {
  const origen = Number((cpOrigen || "1000")[0])
  const destino = Number(cpDestino[0])
  const saltos = Math.min(4, Math.abs(origen - destino))
  const mismaZona = cpOrigen.slice(0, 2) === cpDestino.slice(0, 2)
  const base = mismaZona ? 3800 : 5200 + saltos * 1100
  const porPeso = Math.max(0, Math.ceil(kilos - 1)) * 850
  return { costo: base + porPeso, plazoDias: mismaZona ? 2 : 3 + saltos }
}

/** El envío se puede despachar cuando el pedido está confirmado y todavía no salió. */
export const sePuedeDespachar = (estadoPedido: string, envio: Pick<Envio, "estado">) => estadoPedido === "confirmado" && envio.estado === "a_despachar"
