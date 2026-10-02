import express from "express"
import cors from "cors"
import { z } from "zod"
import { config } from "./config.js"
import { manejarErrores } from "./errors.js"
import { catalogo } from "./routes/catalogo.js"
import { pedidos } from "./routes/pedidos.js"
import { auth } from "./routes/auth.js"
import { admin } from "./routes/admin.js"

// Mensajes de validación en español
z.config(z.locales.es())

export const app = express()

app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: "100kb" }))

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api", catalogo)
app.use("/api", pedidos)
app.use("/api", auth)
app.use("/api/admin", admin)

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})
app.use(manejarErrores)
