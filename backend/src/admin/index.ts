import { Router } from "express"
import { requiereLogin } from "../shared/auth/middleware.js"
import { adminTienda } from "./tienda.js"
import { adminStats } from "./stats.js"
import { adminTurnos } from "./turnos.js"
import { adminClientes } from "./clientes.js"
import { adminServicios } from "./servicios.js"

// Endpoints del panel, montados en /api/admin. Todos piden sesión iniciada.
export const admin = Router()
admin.use(requiereLogin)
admin.use(adminTienda)
admin.use(adminStats)
admin.use(adminTurnos)
admin.use(adminClientes)
admin.use(adminServicios)
