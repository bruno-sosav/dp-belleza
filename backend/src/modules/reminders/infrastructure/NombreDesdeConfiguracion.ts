/** TRANSITORIO (admin): el nombre del negocio sale de la configuración, que todavía no es un módulo. */
import { leerConfigs } from "../../../shared/configuracion.js"
import type { NombreDelNegocio } from "../domain/reminders.ports.js"

export class NombreDesdeConfiguracion implements NombreDelNegocio {
  async obtener() {
    return (await leerConfigs(["nombre_negocio"])).nombre_negocio ?? ""
  }
}
