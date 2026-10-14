/**
 * Errores con status HTTP, para no devolver 500 ante un dato mal mandado.
 *
 * Los campos se asignan en el cuerpo del constructor y no como propiedades de
 * parámetro (`constructor(readonly status: number)`) porque el proyecto usa
 * `erasableSyntaxOnly`: Node ejecuta los .ts borrando los tipos, sin
 * transformarlos, así que solo se puede usar sintaxis que desaparezca sola.
 */

export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details)
export const notFound = (message: string) => new HttpError(404, message)
export const conflict = (message: string) => new HttpError(409, message)
