import express from "express"
import cors from "cors"
import { z } from "zod"
import { config } from "./shared/config.js"
import { manejarErrores } from "./shared/errors.js"
import { auth } from "./shared/auth/routes.js"
import { tienda } from "./ecommerce/routes.js"
import { turnos } from "./turnera/routes.js"
import { miTurno } from "./turnera/miTurno.js"
import { admin } from "./admin/index.js"
import { configuracionPublica } from "./shared/configuracionRoutes.js"
import { mercadopagoPublico } from "./shared/mercadopagoRoutes.js"

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
// Antes que /api/turnos: si no, "mi-turno" se leería como una ruta de turnos.
app.use("/api/turnos/mi-turno", miTurno)
app.use("/api/turnos", turnos)
app.use("/api/configuracion", configuracionPublica)
app.use("/api/mercadopago", mercadopagoPublico)
app.use("/api/admin", admin)

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})
app.use(manejarErrores)
