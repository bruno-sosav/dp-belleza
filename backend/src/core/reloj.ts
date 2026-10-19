/**
 * Puerto "qué hora es". Los casos de uso no le preguntan la hora al sistema
 * directamente: se la piden a un Reloj que reciben por constructor. En
 * producción es el reloj del servidor (en la zona horaria del local, ver
 * config.ts); en los tests, uno fijo, así "faltan 2 horas" o "ya pasó" se
 * pueden probar sin depender de cuándo se corren.
 */
import { hoy, minutosAhora, type FechaISO } from "./tiempo.js"

/** Un momento del día: la fecha y los minutos desde medianoche. */
export type Momento = { fecha: FechaISO; minutos: number }

export interface Reloj {
  ahora(): Momento
}

export const relojDelSistema: Reloj = {
  ahora: () => ({ fecha: hoy(), minutos: minutosAhora() }),
}
