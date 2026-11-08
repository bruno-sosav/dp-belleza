

export type Momento = "antes" | "despues" | "cumpleanos"

export type Tipo = {
  id: number
  nombre: string
  momento: Momento
  horasAntes: number | null
  dias: number | null
  servicio: { id: number; nombre: string } | null
  mensaje: string
}

export type DatosTipo =
  | { momento: "antes"; nombre: string; mensaje: string; horasAntes: number }
  | { momento: "despues"; nombre: string; mensaje: string; dias: number; servicioId: number | null }
  | { momento: "cumpleanos"; nombre: string; mensaje: string; dias: number }

export type EstadoRecordatorio = "enviado" | "omitido"

/** Por turno (antes/después) o por clienta y año (cumpleaños). */
export type Registro = { tipoId: number; turnoId?: number; clienteId?: number; anio?: number }

/** Tiene que venir turnoId, o clienteId y anio (no las dos cosas). */
export function problemaDeRegistro(r: Registro): string | null {
  const porTurno = r.turnoId !== undefined
  const porCumple = r.clienteId !== undefined && r.anio !== undefined
  return porTurno === porCumple ? "Tiene que venir turnoId, o clienteId y anio." : null
}

export function avisoQueToca<T extends { id: number; horasAntes: number }>(horasHastaTurno: number, tipos: T[], hechos: number[]): T | null {
  if (horasHastaTurno <= 0) return null
  const horasHechas = tipos.filter((t) => hechos.includes(t.id)).map((t) => t.horasAntes)
  const limite = horasHechas.length ? Math.min(...horasHechas) : Infinity
  const aplican = tipos
    .filter((t) => !hechos.includes(t.id) && t.horasAntes >= horasHastaTurno && t.horasAntes < limite)
    .sort((a, b) => a.horasAntes - b.horasAntes)
  return aplican[0] ?? null
}

/** El más cercano que no se hizo, como en avisoQueToca. */
export function cumpleQueToca<T extends { id: number; dias: number }>(faltan: number, tipos: T[], hechos: number[]): T | null {
  return tipos.filter((t) => faltan <= t.dias && !hechos.includes(t.id)).sort((a, b) => a.dias - b.dias)[0] ?? null
}

export type DatosMensaje = { nombre: string; servicio: string; fecha: string; hora: string; negocio: string }

/** Reemplaza {nombre} {servicio} {fecha} {hora} {negocio} en el texto del tipo. */
export function armarMensaje(plantilla: string, datos: DatosMensaje) {
  return plantilla.replace(/\{(nombre|servicio|fecha|hora|negocio)\}/g, (_, clave: keyof DatosMensaje) => datos[clave])
}

/** Días al próximo cumpleaños y su año (hoy = 0). El 29/2 cae el 28 en años no bisiestos. */
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

/** Días que se sigue mostrando uno de "después": no se pierde si la dueña no entra, pero no aparecen visitas viejas. */
export const VENTANA_DESPUES_DIAS = 14
