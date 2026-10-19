/**
 * La seña de un turno reservado desde la web: la clienta paga un porcentaje
 * con Mercado Pago y tiene SENA_MINUTOS para hacerlo; si no, el horario se
 * libera. Dominio puro.
 */
import type { Turno } from "./turno.js"

/** Minutos que tiene la clienta para pagar antes de que se libere el horario. */
export const SENA_MINUTOS = 30

/** Seña en pesos enteros. 0 si no hay porcentaje; nunca más que el precio. */
export function montoSena(precio: number, porcentaje: number): number {
  if (porcentaje <= 0) return 0
  return Math.max(1, Math.round((precio * Math.min(porcentaje, 100)) / 100))
}

/** Un pago como lo informa la pasarela, ya traducido. */
export type PagoDeSena = { id: number; aprobado: boolean; monto: number; referencia: string | null }

/** La referencia que viaja en el pago para saber de qué turno es. */
export const referenciaDeSena = (turnoId: number) => `turno-${turnoId}`

/**
 * Qué hacer con un pago que llega para la seña de un turno. Puede llegar dos
 * veces (aviso y vuelta de la clienta) o tarde (después de que venció):
 *   - no aprobado, de menos, o la seña ya estaba pagada: nada;
 *   - turno esperando el pago: queda confirmado;
 *   - venció (cancelado por el sistema) y el horario sigue libre: se recupera;
 *   - venció y el horario ya lo tomó otra: sigue cancelado con la seña pagada
 *     (el panel avisa que hay que devolverla).
 */
export function resultadoDelPago(
  turno: Pick<Turno, "estado" | "canceladoPor" | "sena">,
  pago: PagoDeSena,
  horarioLibre: boolean,
): { aplicar: false } | { aplicar: true; estado: Turno["estado"]; canceladoPor: Turno["canceladoPor"] } {
  if (!pago.aprobado || !turno.sena || turno.sena.estado === "pagada") return { aplicar: false }
  if (pago.monto + 0.01 < turno.sena.monto) return { aplicar: false } // pagó de menos: no es esta seña
  if (turno.estado === "reservado") return { aplicar: true, estado: "confirmado", canceladoPor: null }
  if (turno.estado === "cancelado" && turno.canceladoPor === "sistema" && horarioLibre) {
    return { aplicar: true, estado: "confirmado", canceladoPor: null }
  }
  return { aplicar: true, estado: turno.estado, canceladoPor: turno.canceladoPor }
}
