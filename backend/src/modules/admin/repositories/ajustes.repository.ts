/** Los ajustes en MySQL (tabla `configuracion`): el ÚNICO lugar que la escribe. */
import type { RowDataPacket } from "mysql2"
import { ejecutor, unidadDeTrabajoMySql } from "../../../core/database/unidadDeTrabajo.database.js"
import { CLAVES_AJUSTES, type Ajustes, type ClaveAjuste } from "../models/ajustes.model.js"
import type { AjustesRepository } from "../models/admin.ports.js"

export class MySqlAjustesRepository implements AjustesRepository {
  async leer(): Promise<Ajustes> {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT clave, valor FROM configuracion WHERE clave IN (?)", [CLAVES_AJUSTES])
    return Object.fromEntries(rows.map((r) => [r.clave as string, r.valor as string]))
  }

  async guardar(cambios: Partial<Record<ClaveAjuste, string>>) {
    await unidadDeTrabajoMySql.ejecutar(async (tx) => {
      for (const [clave, valor] of Object.entries(cambios)) {
        await ejecutor(tx).query("UPDATE configuracion SET valor = ? WHERE clave = ?", [valor, clave])
      }
    })
  }
}
