/**
 * Límite simple de pedidos por IP, en memoria. Para las rutas públicas donde
 * alguien podría probar combinaciones a lo bruto (por ejemplo, adivinar el
 * código de un turno ajeno en "Mi turno").
 *
 * En memoria alcanza para una sola instancia de la API; si algún día corren
 * varias, esto pasa a Redis o similar.
 */
import type { RequestHandler } from "express"

export function limitarPorIp({ maximo, ventanaMs, mensaje }: { maximo: number; ventanaMs: number; mensaje: string }): RequestHandler {
  const intentos = new Map<string, { cuenta: number; desde: number }>()
  return (req, res, next) => {
    const ahora = Date.now()
    const ip = req.ip ?? "desconocida"
    const actual = intentos.get(ip)
    if (!actual || ahora - actual.desde > ventanaMs) {
      intentos.set(ip, { cuenta: 1, desde: ahora })
    } else if (++actual.cuenta > maximo) {
      res.status(429).json({ error: mensaje })
      return
    }
    // Limpieza ocasional para que el mapa no crezca sin fin.
    if (intentos.size > 10_000) {
      for (const [clave, v] of intentos) if (ahora - v.desde > ventanaMs) intentos.delete(clave)
    }
    next()
  }
}
