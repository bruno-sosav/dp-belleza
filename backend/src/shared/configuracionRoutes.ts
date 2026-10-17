import { Router } from "express"
import { CLAVES_PUBLICAS, leerConfigs } from "./configuracion.js"

// Datos de contacto del local para la web pública, montado en /api/configuracion.
export const configuracionPublica = Router()

configuracionPublica.get("/", async (_req, res) => {
  const c = await leerConfigs(CLAVES_PUBLICAS)
  res.json({
    nombre: c.nombre_negocio ?? "",
    /** Normalizado (549 + 10 dígitos), listo para wa.me. Vacío si no se cargó. */
    telefono: c.telefono_negocio ?? "",
    direccion: c.direccion_negocio ?? "",
    email: c.email_negocio ?? "",
  })
})
