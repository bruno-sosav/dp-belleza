/** Errores de negocio, sin saber de HTTP: el código lo pone manejarErrores.middleware.ts. */

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
