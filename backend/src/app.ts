import express from "express"
import cors from "cors"
import { z } from "zod"
import { config } from "./core/app.config.js"
import { manejarErrores } from "./core/http/manejarErrores.middleware.js"
import { tienda } from "./ecommerce/routes.js"
import { admin } from "./admin/index.js"
import { catalogo } from "./modules/catalog/catalog.module.js"
import { agenda, turnos } from "./modules/appointments/appointments.module.js"
import { ajustes } from "./modules/admin/admin.module.js"
import { pagos } from "./modules/payments/payments.module.js"
import { auth } from "./modules/auth/auth.module.js"

// Mensajes de validación en español
z.config(z.locales.es())

// Una sola app: cada módulo es un grupo de rutas montado acá.
export const app = express()

// La IP real de quien llama, aunque haya un proxy delante (ver config.proxies).
if (config.proxies > 0) app.set("trust proxy", config.proxies)

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: "100kb" }))

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/auth", auth.rutasWeb)
app.use("/api/tienda", catalogo.rutasTiendaWeb)
app.use("/api/tienda", tienda)
// Reservar, Mi turno y la seña; después, servicios y agenda para la web.
app.use("/api/turnos", turnos.rutasWeb)
app.use("/api/turnos", catalogo.rutasServiciosWeb)
app.use("/api/turnos", agenda.rutasWeb)
app.use("/api/configuracion", ajustes.rutasWeb)
app.use("/api/mercadopago", pagos.rutasWeb)
app.use("/api/admin", admin)

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})
app.use(manejarErrores)
