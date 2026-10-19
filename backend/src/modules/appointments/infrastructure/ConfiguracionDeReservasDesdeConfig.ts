/**
 * TRANSITORIO en cuanto a de dónde lee: los valores de Turnos → Reglas están
 * en la configuración del negocio, que se muda al módulo admin/. Entonces
 * este archivo le pide los datos a ese módulo.
 */
import { leerConfigNumero } from "../../../shared/configuracion.js"
import type { ConfiguracionDeReservas } from "../domain/agenda.ports.js"

export class ConfiguracionDeReservasDesdeConfig implements ConfiguracionDeReservas {
  intervaloMin() {
    return leerConfigNumero("intervalo_turnos_min", 15)
  }

  async reglas() {
    return {
      minHoras: await leerConfigNumero("reserva_anticipacion_min_horas", 2),
      maxDias: await leerConfigNumero("reserva_anticipacion_max_dias", 60),
    }
  }
}
