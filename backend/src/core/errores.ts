/**
 * Errores de negocio. Los lanzan los casos de uso y las reglas de dominio
 * ("ese horario ya está ocupado", "la clienta no existe") SIN saber nada de
 * HTTP: el que los traduce a un código de respuesta es la capa de presentación
 * (core/http/manejarErrores.ts). Así el dominio no depende de Express.
 */

export type TipoDeError =
  | "invalido" //       los datos no sirven (400)
  | "no_autorizado" //  falta iniciar sesión o venció (401)
  | "no_encontrado" //  no existe (404)
  | "conflicto" //      choca con el estado actual: horario ocupado, teléfono repetido (409)
  | "externo" //        falló un servicio de afuera, como Mercado Pago (502)

export class ErrorDeNegocio extends Error {
  constructor(
    public tipo: TipoDeError,
    message: string,
    public detalle?: unknown,
  ) {
    super(message)
    this.name = "ErrorDeNegocio"
  }
}

export const invalido = (mensaje: string, detalle?: unknown) => new ErrorDeNegocio("invalido", mensaje, detalle)
export const noAutorizado = (mensaje: string) => new ErrorDeNegocio("no_autorizado", mensaje)
export const noEncontrado = (que: string) => new ErrorDeNegocio("no_encontrado", `${que} no encontrado`)
export const noExiste = (mensaje: string) => new ErrorDeNegocio("no_encontrado", mensaje)
export const conflicto = (mensaje: string) => new ErrorDeNegocio("conflicto", mensaje)
export const externo = (mensaje: string, detalle?: unknown) => new ErrorDeNegocio("externo", mensaje, detalle)

/** Nombre viejo de `invalido`, para los módulos que todavía no se mudaron a modules/. */
export const malaPeticion = invalido

const tipoPorStatus: Record<number, TipoDeError> = { 400: "invalido", 401: "no_autorizado", 404: "no_encontrado", 409: "conflicto", 502: "externo" }

/**
 * Forma vieja: un error con código HTTP. Queda mientras se mudan los módulos
 * viejos (turnera/, admin/, ecommerce/); por dentro es un ErrorDeNegocio.
 * Los módulos nuevos usan los helpers de arriba.
 */
export class HttpError extends ErrorDeNegocio {
  constructor(status: number, message: string, detalle?: unknown) {
    super(tipoPorStatus[status] ?? "invalido", message, detalle)
  }
}
