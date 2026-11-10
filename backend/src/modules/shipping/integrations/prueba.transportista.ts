/**
 * Transportista del modo prueba: simula a Andreani sin red ni cuenta, para
 * desarrollo y la demo. Cotiza con tarifaDePrueba, inventa un número de envío
 * y arma un seguimiento creíble según el tiempo que pasó desde el despacho.
 */
import { randomBytes } from "node:crypto"
import { tarifaDePrueba, type EventoDeSeguimiento } from "../models/envio.model.js"
import type { Transportista } from "../models/envios.ports.js"

/** Los pasos del seguimiento simulado y a cuántas horas del despacho aparece cada uno. */
const PASOS: { horas: number; estado: string; detalle: string }[] = [
  { horas: 0, estado: "Envío creado", detalle: "El local generó el envío (modo prueba)." },
  { horas: 2, estado: "Ingresado", detalle: "El paquete ingresó a la sucursal de origen." },
  { horas: 24, estado: "En viaje", detalle: "El paquete viaja a la sucursal de destino." },
  { horas: 48, estado: "En distribución", detalle: "El paquete salió a reparto." },
]

const masHoras = (fecha: string, horas: number) => {
  const d = new Date(fecha.replace(" ", "T"))
  d.setHours(d.getHours() + horas)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export class TransportistaDePrueba implements Transportista {
  readonly proveedor = "prueba" as const

  constructor(private ahora: () => Date = () => new Date()) {}

  async cotizar(cpOrigen: string, cpDestino: string, bulto: { kilos: number }) {
    return tarifaDePrueba(cpOrigen, cpDestino, bulto.kilos)
  }

  async despachar(_cpOrigen: string, d: { pedidoId: number }) {
    return { numero: `PRUEBA-${String(d.pedidoId).padStart(6, "0")}-${randomBytes(2).toString("hex").toUpperCase()}` }
  }

  async seguimiento(_numero: string, despachadoAt: string | null): Promise<EventoDeSeguimiento[]> {
    if (!despachadoAt) return []
    const horasPasadas = (this.ahora().getTime() - new Date(despachadoAt.replace(" ", "T")).getTime()) / 3_600_000
    return PASOS.filter((p) => p.horas <= horasPasadas).map((p) => ({ fecha: masHoras(despachadoAt, p.horas), estado: p.estado, detalle: p.detalle }))
  }
}
