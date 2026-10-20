/** Lo que ENTRA por HTTP a los turnos, validado con zod. */
import { z } from "zod"
import { fechaISO, horaHM } from "../../../../core/validacion.js"
import { ESTADOS_TURNO } from "../../domain/estados.js"
import { idDesdeCodigo } from "../../domain/turno.js"

export const idParam = z.coerce.number().int().positive()

const cumple = z
  .object({ dia: z.number().int().min(1).max(31), mes: z.number().int().min(1).max(12) })
  .refine(({ dia, mes }) => dia <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1], "Ese día no existe en ese mes")

/** La reserva desde la web. */
export const reservaWeb = z.object({
  servicioId: z.number().int().positive(),
  fecha: fechaISO,
  hora: horaHM,
  contacto: z.object({
    // Mismo mínimo que pide la web antes de mandar.
    nombreCompleto: z.string().trim().min(3).max(200),
    telefono: z.string().trim().min(6).max(30),
    email: z.email().max(150).optional(),
    notas: z.string().trim().max(1000).optional(),
    cumple: cumple.optional(),
  }),
})

export const turnoDelPanel = z.object({
  clienteId: z.number().int().positive(),
  servicioId: z.number().int().positive(),
  fecha: fechaISO,
  hora: horaHM,
  notas: z.string().trim().max(1000).optional(),
  fueraDeHorario: z.boolean().default(false),
})

export const cambiosTurno = z.object({
  fecha: fechaISO.optional(),
  hora: horaHM.optional(),
  servicioId: z.number().int().positive().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
  fueraDeHorario: z.boolean().default(false),
})

export const nuevoEstado = z.object({ estado: z.enum(ESTADOS_TURNO) })

export const completar = z.object({
  cobro: z
    .object({
      monto: z.number().positive().max(100_000_000),
      medio: z.enum(["efectivo", "debito", "credito", "transferencia", "mercadopago"]),
    })
    .nullable(),
})

/** Hasta dos meses por pedido: alcanza para cualquier vista de agenda. */
const MAX_DIAS_RANGO = 62
const diasEntre = (a: string, b: string) => {
  const [y1, m1, d1] = a.split("-").map(Number)
  const [y2, m2, d2] = b.split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** Sin fechas: los de hoy (`hoy` lo pone el controller con el reloj). */
export const filtrosTurnos = (hoy: string) =>
  z
    .object({ desde: fechaISO.optional(), hasta: fechaISO.optional(), estado: z.enum(ESTADOS_TURNO).optional() })
    .transform((f) => ({ ...f, desde: f.desde ?? hoy, hasta: f.hasta ?? f.desde ?? hoy }))
    .refine((f) => f.desde <= f.hasta, { message: "`desde` no puede ser posterior a `hasta`", path: ["hasta"] })
    .refine((f) => diasEntre(f.desde, f.hasta) <= MAX_DIAS_RANGO, { message: `El rango no puede superar los ${MAX_DIAS_RANGO} días`, path: ["hasta"] })

/** Mi turno: "DP-000123", "dp 123" o "123", y el teléfono. */
export const identificacion = z.object({
  codigo: z
    .string()
    .trim()
    .transform((v) => idDesdeCodigo(v) ?? 0)
    .pipe(z.number().int().positive({ message: "Revisá el código del turno" })),
  telefono: z.string().trim().min(6).max(30),
})

export const tokenSena = z.string().regex(/^[0-9a-f]{32}$/, "Link de pago inválido")
export const tokenPublico = z.string().regex(/^[0-9a-f]{32}$/)
export const pagoId = z.string().regex(/^\d+$/).optional()
