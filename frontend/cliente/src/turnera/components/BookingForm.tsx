import type { BookingContact } from "../data/booking"
import { inputClass } from "../lib/styles"
import Field from "./Field"

type Props = {
  value: BookingContact
  onChange: (contact: BookingContact) => void
}

export default function BookingForm({ value, onChange }: Props) {
  const update = (key: keyof BookingContact, next: string) => onChange({ ...value, [key]: next })

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label="Nombre y apellido" htmlFor="fullName" required className="sm:col-span-2">
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Ej: Bruno Sosa"
          value={value.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Teléfono" htmlFor="phone" required hint="Te confirmamos el turno por WhatsApp.">
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ej: 223 555 1234"
          value={value.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Email" htmlFor="email" hint="Para enviarte el recordatorio.">
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Ej: nombre@gmail.com"
          value={value.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Comentario para la profesional"
        htmlFor="notes"
        className="sm:col-span-2"
        hint="Alergias, embarazo, lesiones o cualquier cosa que debamos saber."
      >
        <textarea
          id="notes"
          rows={3}
          placeholder="Contanos si hay algo a tener en cuenta..."
          value={value.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </Field>
    </div>
  )
}
