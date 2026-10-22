import express, { Router } from "express"
import cors from "cors"
import { z } from "zod"
import { config } from "./core/app.config.js"
import { manejarErrores } from "./core/http/manejarErrores.middleware.js"
import { requiereLogin } from "./core/http/sesion.middleware.js"
import { ajustes, estadisticas } from "./modules/admin/admin.module.js"
import { agenda, turnos } from "./modules/appointments/appointments.module.js"
import { auth } from "./modules/auth/auth.module.js"
import { catalogo } from "./modules/catalog/catalog.module.js"
import { clientes } from "./modules/customers/customers.module.js"
import { inventario } from "./modules/inventory/inventory.module.js"
import { pedidos } from "./modules/orders/orders.module.js"
import { pagos } from "./modules/payments/payments.module.js"
import { recordatorios } from "./modules/reminders/reminders.module.js"

// Mensajes de validación en español
z.config(z.locales.es())

// Una sola app: cada módulo trae sus rutas y se montan acá.
export const app = express()

// La IP real de quien llama, aunque haya un proxy delante (ver config.proxies).
if (config.proxies > 0) app.set("trust proxy", config.proxies)

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: "100kb" }))

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true })
})

// ── Web pública y login ──
app.use("/api/auth", auth.rutasWeb)
app.use("/api/tienda", catalogo.rutasTiendaWeb)
app.use("/api/tienda", pedidos.rutasWeb)
// Reservar, Mi turno y la seña; después, servicios y agenda para la web.
app.use("/api/turnos", turnos.rutasWeb)
app.use("/api/turnos", catalogo.rutasServiciosWeb)
app.use("/api/turnos", agenda.rutasWeb)
app.use("/api/configuracion", ajustes.rutasWeb)
app.use("/api/mercadopago", pagos.rutasWeb)

// ── Panel (/api/admin): primero el login, TODO lo que sigue exige sesión ──
const panel = Router()
panel.use(requiereLogin)
// La agenda antes que las rutas de turnos: /turnos/disponibilidad tiene que
// ganarle a /turnos/:id.
panel.use(agenda.rutasPanel)
panel.use(turnos.rutasPanel)
panel.use(pedidos.rutasPanel)
panel.use(estadisticas.rutasPanel)
panel.use(clientes.rutasPanel)
panel.use(catalogo.rutasPanel)
panel.use(inventario.rutasPanel)
panel.use(ajustes.rutasPanel)
panel.use(recordatorios.rutasPanel)
panel.use(auth.rutasPanel)
panel.use(pagos.rutasPanel)
app.use("/api/admin", panel)

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})
app.use(manejarErrores)
