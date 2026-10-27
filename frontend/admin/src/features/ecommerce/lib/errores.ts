import { ApiError } from "../../../shared/lib/api"

/** El mensaje que mandó el backend, o uno genérico si ni siquiera hubo respuesta. */
export const mensajeDe = (err: unknown) => (err instanceof ApiError ? err.message : "No se pudo guardar. Probá de nuevo.")
