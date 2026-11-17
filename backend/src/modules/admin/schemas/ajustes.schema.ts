/** Solo estas claves, validadas: un "abc" en intervalo_turnos_min rompería la disponibilidad. */
import { z } from "zod"

export const cambiosAjustes = z
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
    // Envíos de la tienda (Ajustes → Envíos).
    envio_modo: z.enum(["desactivado", "prueba", "andreani"]),
    envio_gratis_desde: z.number().int().min(0).max(100_000_000),
    envio_cp_origen: z.union([z.literal(""), z.string().trim().regex(/^\d{4}$/, "El código postal tiene 4 números")]),
    envio_peso_unidad_g: z.number().int().min(1).max(50_000),
    // % de descuento en la tienda en el mes del cumpleaños de la clienta. 0 = sin descuento.
    descuento_cumple_porcentaje: z.number().int().min(0).max(50),
    intervalo_turnos_min: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
  })
  .partial()
