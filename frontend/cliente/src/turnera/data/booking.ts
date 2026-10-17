/**
 * Reserva de turnos: lo que se manda a `POST /api/turnos` y lo que vuelve.
 */
import type { Service } from "@dp/shared/data/services"
import { api } from "../lib/api"

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

/** El turno ya guardado (`TurnoCreadoDTO` en backend/src/turnera/service.ts). */
export type CreatedBooking = {
  id: number
  servicioId: number
  servicio: string
  clienteId: number
  fecha: string
  horaInicio: string
  horaFin: string
  /** Precio congelado al momento de reservar. */
  precio: number
  estado: string
  /** Solo si se cobra seña: hay que mandar a la clienta a `link` (Mercado Pago). */
  sena?: { monto: number; porcentaje: number; link: string; token: string; venceEnMinutos: number }
}

/** Lo que recibe la pantalla de confirmación por `location.state`. */
export type ConfirmedBooking = {
  booking: CreatedBooking
  service: Service
  contact: BookingContact
}

/**
 * Qué le falta al formulario para poder reservar, o `null` si está listo.
 * Mismos mínimos que valida el backend, para no mandar algo que va a rebotar.
 */
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
