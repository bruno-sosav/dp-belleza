/** Lo que devuelve `GET /api/turnos/servicios`. Espejo de `ServicioDTO` (backend/src/modules/catalog/schemas/catalogo.dto.ts). */

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
