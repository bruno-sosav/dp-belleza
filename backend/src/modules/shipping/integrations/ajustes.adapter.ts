/** Cumple FuenteDeAjustes con lo que exporta admin (Ajustes → Envíos y los datos del local). */
import { ajustes } from "../../admin/admin.module.js"
import type { FuenteDeAjustes } from "../models/envios.ports.js"

export const ajustesDeEnvio: FuenteDeAjustes = {
  leer: () => ajustes.envios(),
  remitente: async () => {
    const [nombre, datos] = await Promise.all([ajustes.nombreNegocio(), ajustes.contacto()])
    return { nombre, ...datos }
  },
}
