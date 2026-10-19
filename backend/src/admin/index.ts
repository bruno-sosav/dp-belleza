import { Router } from "express"
import { requiereLogin } from "../core/http/sesion.js"
import { adminTienda } from "./tienda.js"
import { adminStats } from "./stats.js"
import { adminTurnos } from "./turnos.js"
import { adminClientes } from "./clientes.js"
import { adminClientesUnir } from "./clientesUnir.js"
import { adminServicios } from "./servicios.js"
import { adminAgenda } from "./agenda.js"
import { adminConfiguracion } from "./configuracion.js"
import { adminRecordatorios } from "./recordatorios.js"
import { adminMercadoPago } from "./mercadopago.js"
import { adminCuenta } from "./cuenta.js"
import { adminCaja } from "./caja.js"

// Endpoints del panel, montados en /api/admin. Todos piden sesión iniciada.
export const admin = Router()
admin.use(requiereLogin)
admin.use(adminTienda)
admin.use(adminStats)
admin.use(adminTurnos)
admin.use(adminClientes)
admin.use(adminClientesUnir)
admin.use(adminServicios)
admin.use(adminAgenda)
admin.use(adminConfiguracion)
admin.use(adminRecordatorios)
admin.use(adminMercadoPago)
admin.use(adminCuenta)
admin.use(adminCaja)
