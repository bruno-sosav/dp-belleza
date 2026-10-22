/**
 * Recordatorios por WhatsApp. La dueña define TIPOS, cada uno con un momento:
 *   antes       X horas antes de un turno pedido ("confirmame que venís")
 *   despues     X días después de una visita completada ("¿renovamos?"),
 *               opcionalmente solo para un servicio
 *   cumpleanos  X días antes del cumpleaños de la clienta (0 = ese día)
 *
 * A quién le toca cada uno se calcula en el momento; lo que se guarda es lo
 * que ya se mandó u omitió. No hay un proceso que los mande solo (eso necesita
 * un proveedor pago de WhatsApp): el panel abre WhatsApp con el mensaje
 * escrito y la dueña lo envía. Dominio puro.
 */

export type Momento = "antes" | "despues" | "cumpleanos"

export type Tipo = {
  id: number
  nombre: string
  momento: Momento
  /** Solo "antes". */
  horasAntes: number | null
  /** "despues": días después de la visita. "cumpleanos": días antes del cumpleaños. */
  dias: number | null
  /** Solo "despues", opcional: el recordatorio es solo para ese servicio. */
  servicio: { id: number; nombre: string } | null
  mensaje: string
}

/** Lo que se guarda de un tipo: cada momento con su dato de "cuándo". */
export type DatosTipo =
  | { momento: "antes"; nombre: string; mensaje: string; horasAntes: number }
  | { momento: "despues"; nombre: string; mensaje: string; dias: number; servicioId: number | null }
  | { momento: "cumpleanos"; nombre: string; mensaje: string; dias: number }

export type EstadoRecordatorio = "enviado" | "omitido"

/**
 * Qué identifica a un aviso ya hecho: por turno (antes/después) o por clienta
 * y año (cumpleaños: así el año que viene vuelve a aparecer).
 */
export type Registro = { tipoId: number; turnoId?: number; clienteId?: number; anio?: number }

/** Tiene que venir turnoId, o clienteId y anio (no las dos cosas). */
export function problemaDeRegistro(r: Registro): string | null {
  const porTurno = r.turnoId !== undefined
  const porCumple = r.clienteId !== undefined && r.anio !== undefined
  return porTurno === porCumple ? "Tiene que venir turnoId, o clienteId y anio." : null
}

/**
 * El aviso de "antes" que toca para un turno ahora, o null si ninguno.
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
export function avisoQueToca<T extends { id: number; horasAntes: number }>(horasHastaTurno: number, tipos: T[], hechos: number[]): T | null {
  if (horasHastaTurno <= 0) return null
  const horasHechas = tipos.filter((t) => hechos.includes(t.id)).map((t) => t.horasAntes)
  const limite = horasHechas.length ? Math.min(...horasHechas) : Infinity
  const aplican = tipos
    .filter((t) => !hechos.includes(t.id) && t.horasAntes >= horasHastaTurno && t.horasAntes < limite)
    .sort((a, b) => a.horasAntes - b.horasAntes)
  return aplican[0] ?? null
}

/**
 * El tipo de cumpleaños que toca: si hay varios (una promo una semana antes y
 * un saludo ese día), el más cercano que todavía no se hizo, como en "antes".
 */
export function cumpleQueToca<T extends { id: number; dias: number }>(faltan: number, tipos: T[], hechos: number[]): T | null {
  return tipos.filter((t) => faltan <= t.dias && !hechos.includes(t.id)).sort((a, b) => a.dias - b.dias)[0] ?? null
}

export type DatosMensaje = { nombre: string; servicio: string; fecha: string; hora: string; negocio: string }

/** Reemplaza {nombre} {servicio} {fecha} {hora} {negocio} en el texto del tipo. */
export function armarMensaje(plantilla: string, datos: DatosMensaje) {
  return plantilla.replace(/\{(nombre|servicio|fecha|hora|negocio)\}/g, (_, clave: keyof DatosMensaje) => datos[clave])
}

/**
 * Cuántos días faltan para el próximo cumpleaños, y de qué año es ese
 * cumpleaños. Hoy mismo da 0. Un 29 de febrero se festeja el 28 en los años
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

/** Horas entre dos "YYYY-MM-DD HH:MM[:SS]" del mismo reloj (las dos se arman igual: la zona horaria se cancela). */
export function horasEntre(desde: string, hasta: string): number {
  const aMs = (dt: string) => {
    const [f, h = "00:00"] = dt.split(" ")
    const [y, m, d] = f.split("-").map(Number)
    const [hh, mm] = h.split(":").map(Number)
    return new Date(y, m - 1, d, hh, mm).getTime()
  }
  return (aMs(hasta) - aMs(desde)) / 3_600_000
}

/**
 * Hasta cuántos días después de la fecha en que "toca" un recordatorio de
 * después de la visita se lo sigue mostrando. Si la dueña no entra al panel
 * unos días, no lo pierde; pero una visita de hace un año no aparece de golpe
 * al crear un tipo nuevo.
 */
export const VENTANA_DESPUES_DIAS = 14
