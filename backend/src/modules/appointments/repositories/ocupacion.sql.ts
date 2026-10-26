/** Condición SQL de "ocupa lugar" (tabla `turnos` sin alias): excluye seña vencida aunque no la hayan cancelado aún. */
export const SQL_SENA_NO_VENCIDA =
  "NOT (estado = 'reservado' AND sena_estado = 'pendiente' AND sena_vence_at IS NOT NULL AND sena_vence_at < NOW())"
