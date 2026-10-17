import { Router } from "express"
import type { RowDataPacket } from "mysql2"
import { CLAVES_PUBLICAS, leerConfigs } from "./configuracion.js"
import { pool } from "./db.js"
import { porcentajeSena } from "../turnera/sena.js"

// Datos de contacto del local para la web pública, montado en /api/configuracion.
export const configuracionPublica = Router()

configuracionPublica.get("/", async (_req, res) => {
  const c = await leerConfigs(CLAVES_PUBLICAS)
  // La Public Key de Mercado Pago es pública por diseño (va en el navegador).
  const [mp] = await pool.query<RowDataPacket[]>("SELECT public_key FROM mercadopago_cuenta WHERE id = 1")
  res.json({
    nombre: c.nombre_negocio ?? "",
    /** Normalizado (549 + 10 dígitos), listo para wa.me. Vacío si no se cargó. */
    telefono: c.telefono_negocio ?? "",
    direccion: c.direccion_negocio ?? "",
    email: c.email_negocio ?? "",
    /** Hasta cuántas horas antes puede cancelar sola desde la web. */
    cancelacionHoras: Number(c.cancelacion_horas_minimas ?? 24),
    /** % de seña que se cobra al reservar. 0 si no hay, o si Mercado Pago no está conectado. */
    senaPorcentaje: await porcentajeSena(),
    /** null si el local no conectó Mercado Pago. */
    mercadopagoPublicKey: (mp[0]?.public_key as string | undefined) ?? null,
  })
})
