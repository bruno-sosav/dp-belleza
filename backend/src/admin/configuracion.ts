/**
 * Panel: Ajustes. Lee y guarda la tabla `configuracion`.
 *
 * Solo se pueden tocar las claves que están acá, cada una con su validación:
 * la tabla es clave/valor de texto, y un "abc" en `intervalo_turnos_min`
 * rompería la disponibilidad de la web.
 *
 * El login lo exige admin/index.ts.
 */
import { Router } from "express"
import { z } from "zod"
import { enTransaccion } from "../core/database/conexion.js"
import { malaPeticion } from "../core/errores.js"
import { leerConfigs } from "../shared/configuracion.js"
import { clientes } from "../modules/customers/customers.module.js"

export const adminConfiguracion = Router()

const ajustes = z
  .object({
    nombre_negocio: z.string().trim().min(1).max(100),
    telefono_negocio: z.string().trim().max(30),
    // 2 a 4 dígitos, sin el 0: 11, 223, 2966.
    codigo_area_negocio: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, "").replace(/^0/, ""))
      .pipe(z.string().regex(/^\d{2,4}$/, "El código de área tiene 2 a 4 números, sin el 0")),
    direccion_negocio: z.string().trim().max(200),
    email_negocio: z.union([z.literal(""), z.email().max(150)]),
    // Seña al reservar desde la web, en % del precio. 0 = sin seña.
    sena_porcentaje: z.number().int().min(0).max(100),
    // Reglas de la reserva desde la web (Turnos → Reglas).
    reserva_anticipacion_min_horas: z.number().int().min(0).max(168),
    reserva_anticipacion_max_dias: z.number().int().min(1).max(365),
    // 0 = puede cancelar hasta que empiece el turno.
    cancelacion_horas_minimas: z.number().int().min(0).max(168),
    intervalo_turnos_min: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
  })
  .partial()

/** GET /api/admin/configuracion — todos los ajustes, como texto. */
adminConfiguracion.get("/configuracion", async (_req, res) => {
  res.json(await leerConfigs())
})

/**
 * PATCH /api/admin/configuracion   { "telefono_negocio": "223 555-1234", ... }
 *
 * - El teléfono se normaliza igual que el de las clientas (549 + 10 dígitos),
 *   que es lo que pide wa.me.
 *
 * Los recordatorios (anticipación y mensaje) tienen su propia sección:
 * admin/recordatorios.ts.
 */
adminConfiguracion.patch("/configuracion", async (req, res) => {
  const datos = ajustes.parse(req.body)

  if (datos.telefono_negocio) {
    // Con el código de área que viene en el mismo guardado, si cambió.
    const telefono = clientes.normalizarTelefonoCon(datos.telefono_negocio, datos.codigo_area_negocio ?? (await clientes.codigoArea()))
    if (!telefono) throw malaPeticion("El WhatsApp del local no parece un teléfono válido.")
    datos.telefono_negocio = telefono
  }

  await enTransaccion(async (conn) => {
    for (const [clave, valor] of Object.entries(datos)) {
      await conn.query("UPDATE configuracion SET valor = ? WHERE clave = ?", [String(valor), clave])
    }
  })

  if (datos.codigo_area_negocio !== undefined) clientes.olvidarCodigoArea()
  res.json(await leerConfigs())
})
