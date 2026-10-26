/** Servicio de la estética: lo que se reserva como turno. */

export const ETIQUETAS = ["Nuevo", "Más elegido", "Promo"] as const
export type Etiqueta = (typeof ETIQUETAS)[number]

export type Servicio = {
  id: number
  nombre: string
  /** Texto libre que escribe la dueña ("Masajes", "Facial"…). */
  categoria: string
  /** Precio por sesión, en pesos. */
  precio: number
  /** Lo que ocupa en la agenda. */
  duracionMin: number
  imagenUrl: string | null
  descripcionCorta: string | null
  descripcion: string | null
  /** Qué incluye la sesión, un ítem por renglón. */
  incluye: string[]
  profesional: string | null
  etiqueta: Etiqueta | null
  sesionesRecomendadas: number | null
  /** false = pausado: no se ve en la web ni se puede reservar. */
  activo: boolean
}

export type DatosServicio = Omit<Servicio, "id">
export type CambiosServicio = Partial<DatosServicio>

/** Lo único que necesita la agenda de un servicio para dar un turno. */
export type ServicioReservable = Pick<Servicio, "id" | "nombre" | "precio" | "duracionMin">

// ---------------------------------------------------------------- reglas

/** Un servicio nuevo: lo obligatorio, y el resto vacío hasta que la dueña lo complete. Arranca visible en la web. */
export function servicioNuevo(d: Pick<DatosServicio, "nombre" | "categoria" | "precio" | "duracionMin"> & CambiosServicio): DatosServicio {
  return {
    descripcionCorta: null,
    descripcion: null,
    imagenUrl: null,
    incluye: [],
    profesional: null,
    etiqueta: null,
    sesionesRecomendadas: null,
    activo: true,
    ...d,
  }
}

/** "  masajes   relajantes " → "masajes relajantes" */
export function limpiarCategoria(texto: string): string {
  return texto.trim().replace(/\s+/g, " ")
}

/** Para comparar categorías sin importar mayúsculas ni tildes: "Depilación" = "depilacion". */
const clave = (texto: string) =>
  limpiarCategoria(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

/** Reusa una categoría existente si coincide sin mayúsculas ni tildes. `existentes`: de más a menos usada. */
export function elegirCategoria(escrita: string, existentes: string[]): string {
  const limpia = limpiarCategoria(escrita)
  return existentes.find((e) => clave(e) === clave(limpia)) ?? limpia
}
