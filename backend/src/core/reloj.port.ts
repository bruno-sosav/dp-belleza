/** Puerto "qué hora es": en producción el del servidor, en los tests uno fijo. */
import { hoy, minutosAhora, type FechaISO } from "./tiempo.util.js"

/** Un momento del día: la fecha y los minutos desde medianoche. */
export type Momento = { fecha: FechaISO; minutos: number }

export interface Reloj {
  ahora(): Momento
}

export const relojDelSistema: Reloj = {
  ahora: () => ({ fecha: hoy(), minutos: minutosAhora() }),
}
