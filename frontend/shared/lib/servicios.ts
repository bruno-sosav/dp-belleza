import type { Service } from "../types/servicio.types"

/** Categorías en el orden en que aparecen, sin repetir. */
export function categoriesOf(services: Service[]): string[] {
  return [...new Set(services.map((s) => s.category))]
}
