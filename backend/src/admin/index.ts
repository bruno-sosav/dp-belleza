import { Router } from "express"
import { requiereLogin } from "../core/http/sesion.middleware.js"
import { adminTienda } from "./tienda.js"
import { clientes } from "../modules/customers/customers.module.js"
import { catalogo } from "../modules/catalog/catalog.module.js"
import { inventario } from "../modules/inventory/inventory.module.js"
import { agenda, turnos } from "../modules/appointments/appointments.module.js"
import { ajustes, estadisticas } from "../modules/admin/admin.module.js"
import { recordatorios } from "../modules/reminders/reminders.module.js"
import { pagos } from "../modules/payments/payments.module.js"
import { auth } from "../modules/auth/auth.module.js"

// Endpoints del panel, montados en /api/admin. Todos piden sesión iniciada.
export const admin = Router()
// Primero el login: TODO lo que sigue exige sesión.
admin.use(requiereLogin)
// La agenda antes que las rutas de turnos: /turnos/disponibilidad tiene que
// ganarle a /turnos/:id.
admin.use(agenda.rutasPanel)
admin.use(adminTienda)
admin.use(estadisticas.rutasPanel)
admin.use(turnos.rutasPanel)
// Módulos ya reorganizados (modules/): cada uno trae sus rutas de panel.
admin.use(clientes.rutasPanel)
admin.use(catalogo.rutasPanel)
admin.use(inventario.rutasPanel)
admin.use(ajustes.rutasPanel)
admin.use(recordatorios.rutasPanel)
admin.use(auth.rutasPanel)
admin.use(pagos.rutasPanel)
