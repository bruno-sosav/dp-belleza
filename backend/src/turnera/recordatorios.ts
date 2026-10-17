/**
 * Qué recordatorio le toca a cada turno. Separado del router para poder
 * probarlo sin base de datos (test/recordatorios.test.ts).
 */

export type TipoRecordatorio = { id: number; horasAntes: number }

/**
 * El aviso que hay que mandar para un turno ahora, o null si ninguno.
 *
 * Un tipo "aplica" cuando faltan `horasAntes` o menos para el turno. Reglas:
 *   - De los que aplican, se muestra el MÁS CERCANO al turno (menos horas). Si
 *     alguien reserva 10 horas antes, aplican la confirmación de 48 hs y el
 *     recordatorio de 24 hs: con mandarle uno alcanza, y el que tiene sentido
 *     es el último.
 *   - Uno ya mandado (u omitido) tapa a los de más horas: si ya le llegó el de
 *     24 hs, la confirmación de 48 hs no vuelve a aparecer.
 *
 * @param horasHastaTurno horas que faltan (puede tener decimales)
 * @param hechos ids de los tipos ya mandados u omitidos para este turno
 */
export function avisoQueToca(
  horasHastaTurno: number,
  tipos: TipoRecordatorio[],
  hechos: number[],
): TipoRecordatorio | null {
  if (horasHastaTurno <= 0) return null
  const horasHechas = tipos.filter((t) => hechos.includes(t.id)).map((t) => t.horasAntes)
  const limite = horasHechas.length ? Math.min(...horasHechas) : Infinity
  const aplican = tipos
    .filter((t) => !hechos.includes(t.id) && t.horasAntes >= horasHastaTurno && t.horasAntes < limite)
    .sort((a, b) => a.horasAntes - b.horasAntes)
  return aplican[0] ?? null
}

export type DatosMensaje = { nombre: string; servicio: string; fecha: string; hora: string; negocio: string }

/** Reemplaza {nombre} {servicio} {fecha} {hora} {negocio} en el texto del tipo. */
export function armarMensaje(plantilla: string, datos: DatosMensaje) {
  return plantilla.replace(/\{(nombre|servicio|fecha|hora|negocio)\}/g, (_, clave: keyof DatosMensaje) => datos[clave])
}
