import { Router } from "express"
import { requiereLogin } from "../shared/auth/middleware.js"
import { adminTienda } from "./tienda.js"

// Endpoints del panel, montados en /api/admin. Todos piden sesión iniciada.
// La turnera agrega acá su router (por ejemplo, admin/turnos.ts).
export const admin = Router()
admin.use(requiereLogin)
admin.use(adminTienda)
