/**
 * Estadísticas del panel. Los números se calculan en SQL (GROUP BY); acá están
 * el rango de fechas y la serie diaria con los días vacíos. Dominio puro.
 *
 * OJO con los días de la semana — en este proyecto hay tres convenciones:
 *   horarios_atencion.dia_semana   ISO 8601:  1 = lunes  ... 7 = domingo
 *   DayStats.weekday (frontend)    JavaScript: 0 = domingo ... 6 = sábado
 *   MySQL DAYOFWEEK()              1 = domingo ... 7 = sábado
 * La serie usa la de JavaScript, que es la que esperan los gráficos.
 */

/** Un día de la serie. */
export type Dia = {
  fecha: string
  /** 0 = domingo ... 6 = sábado. */
  diaSemana: number
  /** Plata de los turnos completados (precio congelado de cada uno). */
  servicios: number
  /** Plata de la tienda: en 0 hasta que se conecten los pedidos. */
  tienda: number
  pedidos: number
  realizados: number
  cancelados: number
  /** "No vino" sin avisar. */
  ausentes: number
}

/** Lo que dice la base de un día con movimiento. */
export type MovimientoDelDia = { fecha: string; ganancia: number; realizados: number; cancelados: number; ausentes: number }

/** Un servicio en el ranking del período. */
export type ServicioHecho = { id: number; nombre: string; cantidad: number; ganancia: number }

const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`

/**
 * Rango [desde, hasta) de los últimos `dias` días, terminando hoy inclusive.
 * `hasta` es mañana: así los turnos de hoy entran completos sin comparar horas.
 */
export function rango(hoy: string, dias: number): { desde: string; hasta: string } {
  const [y, m, d] = hoy.split("-").map(Number)
  return { desde: fmt(new Date(y, m - 1, d - dias + 1)), hasta: fmt(new Date(y, m - 1, d + 1)) }
}

/**
 * La serie de los últimos `dias` días, incluidos los que no tuvieron
 * movimiento (en 0): los gráficos necesitan la serie completa, si no un día
 * sin turnos desaparecería del eje en vez de mostrarse vacío.
 */
export function serieDiaria(hoy: string, dias: number, movimientos: MovimientoDelDia[]): Dia[] {
  const [y, m, d] = hoy.split("-").map(Number)
  const porFecha = new Map(movimientos.map((x) => [x.fecha, x]))
  const serie: Dia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = new Date(y, m - 1, d - i)
    const mov = porFecha.get(fmt(fecha))
    serie.push({
      fecha: fmt(fecha),
      diaSemana: fecha.getDay(),
      servicios: mov?.ganancia ?? 0,
      tienda: 0,
      pedidos: 0,
      realizados: mov?.realizados ?? 0,
      cancelados: mov?.cancelados ?? 0,
      ausentes: mov?.ausentes ?? 0,
    })
  }
  return serie
}
