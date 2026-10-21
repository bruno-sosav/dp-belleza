/** Las reglas de Turnos → Reglas, desde los ajustes del negocio (módulo admin). */
import { ajustes } from "../../admin/admin.module.js"
import type { ConfiguracionDeReservas } from "../domain/agenda.ports.js"

export class ConfiguracionDeReservasDesdeAjustes implements ConfiguracionDeReservas {
  intervaloMin() {
    return ajustes.intervaloTurnos()
  }

  reglas() {
    return ajustes.reglasDeReserva()
  }
}
