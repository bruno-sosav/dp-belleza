/** Implementa el puerto CodigoAreaDelLocal con los ajustes del negocio (módulo admin, que lo guarda un minuto en memoria). */
import { ajustes } from "../../admin/admin.module.js"
import type { CodigoAreaDelLocal } from "../models/clientes.ports.js"

export class CodigoAreaDesdeAjustes implements CodigoAreaDelLocal {
  obtener() {
    return ajustes.codigoArea()
  }
}
