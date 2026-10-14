/**
 * API de Dp.belleza. UNA sola aplicación con un módulo por dominio.
 *
 *     /api/turnos/*    -> src/turnera/     (sub-equipo A)
 *     /api/tienda/*    -> src/ecommerce/   (sub-equipo B)
 *     /api/admin/*     -> src/admin/
 *
 * No son tres servidores: son tres grupos de rutas sobre la misma conexión y el
 * mismo login. Los equipos trabajan en carpetas que no se tocan.
 *
 * Los models de las tablas van en src/shared/, no dentro de cada módulo, porque
 * `clientes`, `usuarios` y `configuracion` las usan los dos dominios.
 * Ver backend/README.md.
 */
import express from "express"
import type { NextFunction, Request, Response } from "express"
import { config } from "./shared/config.ts"
import { checkConnection } from "./shared/db.ts"
import { HttpError } from "./shared/errors.ts"
import { turneraRouter } from "./turnera/routes.ts"

const app = express()

app.use(express.json())

/**
 * CORS: la web pública y el panel son dos apps en dos orígenes distintos, y
 * ninguna se sirve desde acá, así que el navegador exige permiso explícito.
 */
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization")
    res.setHeader("Access-Control-Allow-Credentials", "true")
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204)
    return
  }
  next()
})

/** Para saber si la API está viva y si llega a la base. */
app.get("/api/health", async (_req, res) => {
  await checkConnection()
  res.json({ ok: true })
})

app.use("/api/turnos", turneraRouter)
// app.use("/api/tienda", ecommerceRouter)   <- sub-equipo de ecommerce
// app.use("/api/admin",  adminRouter)       <- panel

app.use((req, res) => {
  res.status(404).json({ error: `No existe ${req.method} ${req.path}` })
})

/**
 * Manejo de errores. Express 5 pasa acá también los errores de los handlers
 * async, así que no hace falta try/catch en cada ruta.
 *
 * Los HttpError llevan un mensaje pensado para mostrarle a la clienta. Cualquier
 * otra cosa es un bug: se registra completo en el servidor y afuera va un 500
 * genérico, para no filtrar detalles de la base.
 */
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details })
    return
  }
  console.error("Error no manejado:", error)
  res.status(500).json({ error: "Error interno del servidor." })
})

const server = app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`)
  console.log(`  health -> http://localhost:${config.port}/api/health`)
})

// Que Ctrl+C cierre las conexiones en vez de dejarlas colgadas.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
