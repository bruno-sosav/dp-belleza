import { Router } from "express"
import { requiereLogin } from "../core/http/sesion.js"
import { adminTienda } from "./tienda.js"
import { adminStats } from "./stats.js"
import { adminTurnos } from "./turnos.js"
import { clientes } from "../modules/customers/customers.module.js"
import { catalogo } from "../modules/catalog/catalog.module.js"
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
// Módulos ya reorganizados (modules/): cada uno trae sus rutas de panel.
admin.use(clientes.rutasPanel)
admin.use(catalogo.rutasPanel)
admin.use(adminAgenda)
admin.use(adminConfiguracion)
admin.use(adminRecordatorios)
admin.use(adminMercadoPago)
admin.use(adminCuenta)
admin.use(adminCaja)
