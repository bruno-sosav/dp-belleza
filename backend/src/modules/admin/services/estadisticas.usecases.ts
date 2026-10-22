/**
 * Casos de uso de las estadísticas. Lo que sigue en el panel son cuentas de
 * presentación sobre la serie ya agregada (días más movidos, promedios por día
 * de la semana): son 180 puntos, no miles de filas.
 */
import type { Reloj } from "../../../core/reloj.port.js"
import { rango, serieDiaria, type Dia, type ServicioHecho } from "../models/estadisticas.model.js"
import type { ConsultasDeEstadisticas } from "../models/admin.ports.js"

export class VerEstadisticas {
  constructor(
    private consultas: ConsultasDeEstadisticas,
    private reloj: Reloj,
  ) {}

  /**
   * Serie diaria de los últimos `dias`. El panel pide 180 de una vez y va
   * cortando según el período (7/30/90): cambiar de filtro no hace otro pedido.
   * La tienda todavía no suma (`tiendaConectada: false`, para que el panel
   * muestre "pendiente" en vez de un $0 que sería mentira).
   */
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
