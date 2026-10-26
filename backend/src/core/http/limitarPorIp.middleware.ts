/** Límite de pedidos por IP, en memoria (una sola instancia; con varias, Redis). Contra fuerza bruta y spam de reservas. */
import type { RequestHandler } from "express"

type Opciones = {
  maximo: number
  ventanaMs: number
  mensaje: string
  /** Contar solo respuestas < 400: equivocarse de horario no gasta intentos, tomar turnos sí. */
  soloExitosos?: boolean
}

export function limitarPorIp({ maximo, ventanaMs, mensaje, soloExitosos = false }: Opciones): RequestHandler {
  const intentos = new Map<string, { cuenta: number; desde: number }>()

  const vigente = (ip: string, ahora: number) => {
    const actual = intentos.get(ip)
    if (!actual || ahora - actual.desde > ventanaMs) {
      const nuevo = { cuenta: 0, desde: ahora }
      intentos.set(ip, nuevo)
      return nuevo
    }
    return actual
  }

  return (req, res, next) => {
    const ahora = Date.now()
    const ip = req.ip ?? "desconocida"
    const actual = vigente(ip, ahora)
    if (actual.cuenta >= maximo) {
      res.status(429).json({ error: mensaje })
      return
    }
    if (soloExitosos) {
      res.on("finish", () => {
        if (res.statusCode < 400) vigente(ip, Date.now()).cuenta++
      })
    } else {
      actual.cuenta++
    }
    // Limpieza ocasional para que el mapa no crezca sin fin.
    if (intentos.size > 10_000) {
      for (const [clave, v] of intentos) if (ahora - v.desde > ventanaMs) intentos.delete(clave)
    }
    next()
  }
}
