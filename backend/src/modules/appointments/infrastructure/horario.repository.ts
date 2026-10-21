/** Horario de atención en MySQL (tabla `horarios_atencion`). */
import type { RowDataPacket } from "mysql2"
import { ejecutor, unidadDeTrabajoMySql } from "../../../core/database/unidadDeTrabajo.database.js"
import type { HorarioRepository } from "../domain/agenda.ports.js"
import type { Franja } from "../domain/horario.model.js"

export class MySqlHorarioRepository implements HorarioRepository {
  async listar() {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      "SELECT dia_semana, hora_inicio, hora_fin FROM horarios_atencion ORDER BY dia_semana, hora_inicio",
    )
    return rows.map((r) => ({ diaSemana: r.dia_semana, desde: String(r.hora_inicio).slice(0, 5), hasta: String(r.hora_fin).slice(0, 5) }))
  }

  /** En una transacción: nunca queda la semana a medias. */
  async reemplazar(franjas: Franja[]) {
    await unidadDeTrabajoMySql.ejecutar(async (tx) => {
      await ejecutor(tx).query("DELETE FROM horarios_atencion")
      if (franjas.length) {
        await ejecutor(tx).query("INSERT INTO horarios_atencion (dia_semana, hora_inicio, hora_fin) VALUES ?", [
          franjas.map((f) => [f.diaSemana, f.desde, f.hasta]),
        ])
      }
    })
  }
}
