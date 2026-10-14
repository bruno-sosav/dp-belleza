/**
 * Formas que el frontend de turnera espera intercambiar con el backend.
 * Hoy no se envía nada: la confirmación es visual.
 */

export type BookingContact = {
  fullName: string
  phone: string
  email: string
  notes: string
}

export const emptyContact: BookingContact = {
  fullName: "",
  phone: "",
  email: "",
  notes: "",
}

/** Payload de la reserva — lo que iría en el POST cuando exista la API. */
export type BookingRequest = {
  serviceId: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM en 24hs */
  time: string
  contact: BookingContact
}

/** Datos mínimos para poder reservar: nombre y teléfono. */
export function isContactComplete(contact: BookingContact) {
  return contact.fullName.trim().length > 2 && contact.phone.trim().length > 5
}
