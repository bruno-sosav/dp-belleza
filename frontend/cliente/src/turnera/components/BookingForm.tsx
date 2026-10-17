import type { BookingContact } from "../data/booking"
import { inputClass } from "../lib/styles"
import { monthLabels } from "../data/availability"
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
        label="Tu cumpleaños"
        htmlFor="birthDay"
        className="sm:col-span-2"
        hint="Opcional. Solo el día y el mes, para saludarte (y quizás un regalo 🎁)."
      >
        <div className="flex gap-3">
          <select
            id="birthDay"
            aria-label="Día de tu cumpleaños"
            value={value.birthDay}
            onChange={(e) => update("birthDay", e.target.value)}
            className={`${inputClass} w-28`}
          >
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <select
            aria-label="Mes de tu cumpleaños"
            value={value.birthMonth}
            onChange={(e) => update("birthMonth", e.target.value)}
            className={`${inputClass} w-44`}
          >
            <option value="">Mes</option>
            {monthLabels.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
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
