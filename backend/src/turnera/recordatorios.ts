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

/**
 * Cuántos días faltan para el próximo cumpleaños, y de qué año es ese
 * cumpleaños (con eso se registra que ya se saludó, así el año que viene vuelve
 * a aparecer). Hoy mismo da 0. Un 29 de febrero se festeja el 28 en los años
 * que no son bisiestos.
 */
export function proximoCumple(hoy: string, dia: number, mes: number): { dias: number; anio: number } {
  const [y, m, d] = hoy.split("-").map(Number)
  const base = Date.UTC(y, m - 1, d)
  const enAnio = (anio: number) => {
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
    const diaReal = mes === 2 && dia === 29 && !bisiesto ? 28 : dia
    return Date.UTC(anio, mes - 1, diaReal)
  }
  const anio = enAnio(y) >= base ? y : y + 1
  return { dias: Math.round((enAnio(anio) - base) / 86_400_000), anio }
}

/**
 * Hasta cuántos días después de la fecha en que "toca" un recordatorio de
 * después de la visita se lo sigue mostrando. Si la dueña no entra al panel
 * unos días, no lo pierde; pero una visita de hace un año no aparece de golpe
 * al crear un tipo nuevo.
 */
export const VENTANA_DESPUES_DIAS = 14
