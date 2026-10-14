/**
 * Validación de lo que entra por HTTP.
 *
 * A mano y sin librería: son pocos campos y así no se agrega una dependencia
 * más al TP. Si el backend crece, acá entra zod.
 *
 * La regla es que nada llegue al service sin validar: el service asume que lo
 * que recibe tiene el tipo que dice.
 */
import { badRequest } from "../shared/errors.ts"
import { validarFecha, validarHora, type FechaISO, type HoraHM } from "./tiempo.ts"

export type NuevoTurno = {
  servicioId: number
  fecha: FechaISO
  hora: HoraHM
  contacto: {
    nombreCompleto: string
    telefono: string
    email: string | null
    notas: string | null
  }
}

function texto(valor: unknown, campo: string, { min = 1, max = 500 } = {}): string {
  if (typeof valor !== "string") throw badRequest(`${campo} tiene que ser texto.`)
  const limpio = valor.trim()
  // Vacío y "corto" son dos problemas distintos: decirle "es obligatorio" a
  // alguien que SÍ escribió algo lo deja sin saber qué corregir.
  if (limpio.length === 0) throw badRequest(`${campo} es obligatorio.`)
  if (limpio.length < min) throw badRequest(`${campo} es demasiado corto.`)
  if (limpio.length > max) throw badRequest(`${campo} no puede tener más de ${max} caracteres.`)
  return limpio
}

function textoOpcional(valor: unknown, campo: string, max = 500): string | null {
  if (valor === undefined || valor === null || valor === "") return null
  return texto(valor, campo, { max })
}

export function parsearId(valor: unknown, campo = "El id"): number {
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${campo} tiene que ser un número entero.`)
  return n
}

export function parsearNuevoTurno(body: unknown): NuevoTurno {
  if (typeof body !== "object" || body === null) throw badRequest("Falta el cuerpo del pedido.")
  const b = body as Record<string, unknown>

  const contacto = (b.contacto ?? {}) as Record<string, unknown>
  const email = textoOpcional(contacto.email, "El email", 150)
  if (email !== null && !email.includes("@")) {
    throw badRequest("El email no parece válido.")
  }

  return {
    servicioId: parsearId(b.servicioId, "El servicio"),
    fecha: validarFecha(texto(b.fecha, "La fecha")),
    hora: validarHora(texto(b.hora, "La hora")),
    contacto: {
      // Mismo mínimo que pide el front en isContactComplete().
      nombreCompleto: texto(contacto.nombreCompleto, "El nombre", { min: 3, max: 200 }),
      telefono: texto(contacto.telefono, "El teléfono", { min: 6, max: 30 }),
      email,
      notas: textoOpcional(contacto.notas, "Las notas", 1000),
    },
  }
}
