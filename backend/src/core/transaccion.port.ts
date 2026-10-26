/** Puerto de transacciones: opaco para models/ y services/; la implementación está en core/database. */
export interface Transaccion {
  readonly __transaccion: true
}

export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T>
}
