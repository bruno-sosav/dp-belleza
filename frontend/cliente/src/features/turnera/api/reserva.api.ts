/**
 * Reserva de turnos: lo que se manda a `POST /api/turnos` y lo que vuelve.
 */
import type { Service } from "@dp/shared/types/servicio.types"
import { api } from "../../../shared/lib/api"

export type BookingContact = {
  fullName: string
  phone: string
  email: string
  notes: string
  /** Cumpleaños, opcional: día y mes como texto del desplegable ("" = no lo puso). */
  birthDay: string
  birthMonth: string
}

export const emptyContact: BookingContact = {
  fullName: "",
  phone: "",
  email: "",
  notes: "",
  birthDay: "",
  birthMonth: "",
}

export type BookingRequest = {
  serviceId: number
  /** YYYY-MM-DD */
  date: string
  /** HH:MM en 24hs */
  time: string
  contact: BookingContact
}

/** El turno ya guardado (`aReservaHecha` en backend/src/modules/appointments/schemas/turnos.dto.ts). */
export type CreatedBooking = {
  id: number
  estado: string
  fecha: string
  horaInicio: string
  /** Precio congelado al momento de reservar. */
  precio: number
  /** Para la URL de la confirmación (/reserva-confirmada?t=…). */
  token: string
  /** Solo si se cobra seña: hay que mandar a la clienta a `link` (Mercado Pago). */
  sena?: { monto: number; porcentaje: number; link: string; token: string; venceEnMinutos: number }
}

/** Lo que recibe la pantalla de confirmación por `location.state`. */
export type ConfirmedBooking = {
  booking: CreatedBooking
  service: Service
  contact: BookingContact
}

/** Qué le falta al formulario (o `null`). Mismos mínimos que valida el backend. */
export function contactProblem(contact: BookingContact): string | null {
  if (contact.fullName.trim().length < 3 || contact.phone.trim().length < 6) {
    return "Completá al menos tu nombre y tu teléfono para confirmar."
  }
  const email = contact.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Revisá el email: parece que le falta algo. Si no querés dejarlo, borralo."
  }
  if (Boolean(contact.birthDay) !== Boolean(contact.birthMonth)) {
    return "Para el cumpleaños elegí el día y el mes (o dejá los dos vacíos)."
  }
  if (contact.birthDay && Number(contact.birthDay) > [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][Number(contact.birthMonth) - 1]) {
    return "Revisá tu cumpleaños: ese día no existe en ese mes."
  }
  return null
}

export function createBooking({ serviceId, date, time, contact }: BookingRequest) {
  const email = contact.email.trim()
  const notes = contact.notes.trim()
  return api<CreatedBooking>("/api/turnos", {
    method: "POST",
    body: {
      servicioId: serviceId,
      fecha: date,
      hora: time,
      contacto: {
        nombreCompleto: contact.fullName.trim(),
        telefono: contact.phone.trim(),
        // Opcionales: vacíos no se mandan (el backend rechaza un email "").
        ...(email ? { email } : {}),
        ...(notes ? { notas: notes } : {}),
        ...(contact.birthDay && contact.birthMonth
          ? { cumple: { dia: Number(contact.birthDay), mes: Number(contact.birthMonth) } }
          : {}),
      },
    },
  })
}

/** Código que ve la clienta: "DP-000123". Sale del id real, así lo puede dictar en el local. */
export function bookingCode(id: number) {
  return `DP-${String(id).padStart(6, "0")}`
}

/** Lo que devuelve GET /api/turnos/reserva/:token. */
type ReservaGuardada = {
  id: number
  estado: string
  fecha: string
  horaInicio: string
  horaFin: string
  precio: number
  notas: string | null
  servicio: { id: number; nombre: string; duracionMin: number; profesional: string | null }
  cliente: { nombre: string; telefono: string; email: string | null }
}

/** Confirmación por el token de la URL, para cuando se recarga y se perdió el `state`. */
export async function fetchConfirmedBooking(token: string): Promise<ConfirmedBooking> {
  const r = await api<ReservaGuardada>(`/api/turnos/reserva/${token}`)
  return {
    booking: {
      id: r.id,
      estado: r.estado,
      fecha: r.fecha,
      horaInicio: r.horaInicio,
      precio: r.precio,
      token,
    },
    service: {
      id: r.servicio.id,
      name: r.servicio.nombre,
      category: "",
      price: r.precio,
      durationMin: r.servicio.duracionMin,
      image: null,
      shortDescription: null,
      description: null,
      includes: [],
      ...(r.servicio.profesional ? { professional: r.servicio.profesional } : {}),
    },
    contact: { fullName: r.cliente.nombre, phone: r.cliente.telefono, email: r.cliente.email ?? "", notes: r.notas ?? "", birthDay: "", birthMonth: "" },
  }
}
