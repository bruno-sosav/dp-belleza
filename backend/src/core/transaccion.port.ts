/**
 * Puerto de transacciones (clean architecture): los casos de uso dicen "hacé
 * esto todo junto o nada", sin saber que abajo hay MySQL.
 *
 * `Transaccion` es opaca para domain/ y application/: solo la pasan de mano en
 * mano a los repositorios. Quien sabe que en realidad es una conexión de
 * mysql2 es la infraestructura (core/database/unidadDeTrabajo.database.ts).
 */
export interface Transaccion {
  readonly __transaccion: true
}

export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T>
}
