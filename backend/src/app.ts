import express from "express"
import cors from "cors"
import { z } from "zod"
import { config } from "./shared/config.js"
import { manejarErrores } from "./shared/errors.js"
import { auth } from "./shared/auth/routes.js"
import { tienda } from "./ecommerce/routes.js"
import { turnos } from "./turnera/routes.js"
import { admin } from "./admin/index.js"

// Mensajes de validación en español
z.config(z.locales.es())

// Una sola app: cada módulo es un grupo de rutas montado acá.
export const app = express()

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: "100kb" }))

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/auth", auth)
app.use("/api/tienda", tienda)
app.use("/api/turnos", turnos)
app.use("/api/admin", admin)

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})
app.use(manejarErrores)
