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

/** Códigos de mysql2/Node cuando no se puede llegar a la base. */
const SIN_BASE = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ER_ACCESS_DENIED_ERROR"])

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
  // Body de más de 100 kB (límite de express.json en app.ts)
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "El pedido es demasiado grande" })
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
  // MySQL no contesta (apagado, sin red, sin conexiones libres): el servicio no está disponible
  // por ahora, no es que el pedido esté mal. Mismo criterio que /api/salud.
  if (SIN_BASE.has(err?.code)) {
    console.error(err)
    res.status(503).json({ error: "El servicio no está disponible en este momento. Probá de nuevo en unos minutos." })
    return
  }
  console.error(err)
  res.status(500).json({ error: "Error interno del servidor" })
}
