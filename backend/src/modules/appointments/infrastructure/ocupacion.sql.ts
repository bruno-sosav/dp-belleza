/**
 * Condición SQL (sobre la tabla `turnos`, sin alias) de "este turno ocupa
 * lugar": deja afuera los de seña vencida sin pagar, aunque el proceso que los
 * cancela todavía no haya pasado. Es infraestructura: la regla de negocio
 * equivalente está en domain/estados.model.ts (ESTADOS_OCUPAN) y en la seña.
 */
export const SQL_SENA_NO_VENCIDA =
  "NOT (estado = 'reservado' AND sena_estado = 'pendiente' AND sena_vence_at IS NOT NULL AND sena_vence_at < NOW())"
