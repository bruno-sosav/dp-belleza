/** El nombre del negocio ({negocio} en los mensajes), desde los ajustes (módulo admin). */
import { ajustes } from "../../admin/admin.module.js"
import type { NombreDelNegocio } from "../domain/recordatorios.ports.js"

export class NombreDesdeAjustes implements NombreDelNegocio {
  obtener() {
    return ajustes.nombreNegocio()
  }
}
