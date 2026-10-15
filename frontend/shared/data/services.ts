/**
 * Servicios de la estética — la forma que devuelve `GET /api/turnos/servicios`.
 *
 * Es el contrato con el backend (ver `ServicioDTO` en
 * backend/src/turnera/service.ts): si cambia uno, cambia el otro. Los datos ya
 * no viven acá, los carga la dueña desde el panel.
 */

export type ServiceBadge = "Nuevo" | "Más elegido" | "Promo"

export type Service = {
  id: number
  name: string
  /** Texto libre que escribe la dueña: las categorías salen de los servicios cargados. */
  category: string
  /** Precio por sesión, en pesos. */
  price: number
  /** Duración del turno en minutos — define el tamaño del bloque en la agenda. */
  durationMin: number
  image: string | null
  shortDescription: string | null
  description: string | null
  /** Qué incluye la sesión, para mostrar en el detalle. */
  includes: string[]
  /** Profesional a cargo. Opcional: la estética puede tener una sola. */
  professional?: string
  badge?: ServiceBadge
  /** Cantidad de sesiones recomendadas para ver resultados. */
  recommendedSessions?: number
}

/** Categorías en el orden en que aparecen, sin repetir. */
export function categoriesOf(services: Service[]): string[] {
  return [...new Set(services.map((s) => s.category))]
}
