import type { Reloj } from "../../../core/reloj.port.js"
import { rango, serieDiaria, type Dia, type ServicioHecho } from "../models/estadisticas.model.js"
import type { ConsultasDeEstadisticas } from "../models/admin.ports.js"

export class VerEstadisticas {
  constructor(
    private consultas: ConsultasDeEstadisticas,
    private reloj: Reloj,
  ) {}

  /** Serie de los últimos `dias`. `tiendaConectada: false` hasta que sume la tienda: el panel muestra "pendiente". */
  async serie(dias: number): Promise<{ dias: Dia[]; tiendaConectada: boolean }> {
    const hoy = this.reloj.ahora().fecha
    const { desde, hasta } = rango(hoy, dias)
    return { dias: serieDiaria(hoy, dias, await this.consultas.movimientoPorDia(desde, hasta)), tiendaConectada: false }
  }

  /** Servicios más hechos del período: solo turnos completados (un cancelado no es un servicio prestado). */
  serviciosMasHechos(dias: number): Promise<ServicioHecho[]> {
    const { desde, hasta } = rango(this.reloj.ahora().fecha, dias)
    return this.consultas.serviciosHechos(desde, hasta)
  }

  /** Qué se hizo un día puntual (el detalle que se abre al tocar un día del calendario). */
  serviciosDelDia(fecha: string): Promise<ServicioHecho[]> {
    return this.consultas.serviciosDelDia(fecha)
  }
}
