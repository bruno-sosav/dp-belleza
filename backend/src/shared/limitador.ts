/**
 * Límite simple de pedidos por IP, en memoria. Para las rutas públicas donde
 * alguien podría abusar: probar combinaciones a lo bruto (el código de un turno
 * ajeno en "Mi turno", contraseñas en el login) o llenar la agenda de reservas.
 *
 * En memoria alcanza para una sola instancia de la API; si algún día corren
 * varias, esto pasa a Redis o similar.
 */
import type { RequestHandler } from "express"

type Opciones = {
  maximo: number
  ventanaMs: number
  mensaje: string
  /**
   * Contar solo lo que salió bien (respuesta < 400). Para las reservas: una
   * clienta que se equivoca de horario y prueba otro no debería gastar intentos;
   * lo que se limita es cuántos turnos se toman.
   */
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
