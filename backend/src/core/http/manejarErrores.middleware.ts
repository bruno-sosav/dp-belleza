import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import { ErrorDeNegocio } from "../negocio.error.js"
import type { TipoDeError } from "../negocio.error.js"

/** El único lugar que sabe qué código HTTP corresponde a cada tipo de error de negocio. */
const statusPorTipo: Record<TipoDeError, number> = {
  invalido: 400,
  no_autorizado: 401,
  no_encontrado: 404,
  conflicto: 409,
  externo: 502,
}

/** Último middleware: cualquier error sale como { error, detalle? }. */
export const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      detalle: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    })
    return
  }
  if (err instanceof ErrorDeNegocio) {
    res.status(statusPorTipo[err.tipo]).json({ error: err.message, ...(err.detalle ? { detalle: err.detalle } : {}) })
    return
  }
  // JSON mal formado en el body
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" })
    return
  }
  // Errores de MySQL que son culpa de los datos enviados, no del servidor
  if (err?.code === "ER_DUP_ENTRY") {
    res.status(409).json({ error: "Ya existe un registro con ese valor" })
    return
  }
  if (err?.code === "ER_NO_REFERENCED_ROW_2") {
    res.status(400).json({ error: "Se hace referencia a un registro que no existe (por ejemplo, la categoría)" })
    return
  }
  console.error(err)
  res.status(500).json({ error: "Error interno del servidor" })
}
