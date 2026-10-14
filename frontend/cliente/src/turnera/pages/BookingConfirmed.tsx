import { Link, useLocation } from "react-router-dom"
import type { BookingRequest } from "../data/booking"
import { getServiceById } from "../data/services"
import { formatPrice } from "../../ecommerce/lib/format"
import { formatDuration, formatLongDate, formatTime } from "../lib/format"
import Stepper from "../components/Stepper"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

/** "2026-09-22" → Date local, sin corrimiento por zona horaria. */
function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** Código visual del turno, derivado de los datos para que no cambie al re-renderizar. */
function bookingCode(booking: BookingRequest) {
  const raw = `${booking.serviceId}${booking.date}${booking.time}`.replace(/\D/g, "")
  return `DP-${raw.slice(-6).padStart(6, "0")}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-dark py-3 text-sm last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}

export default function BookingConfirmed() {
  const location = useLocation()
  const booking = location.state as BookingRequest | null
  const service = booking ? getServiceById(booking.serviceId) : undefined

  if (!booking || !service) {
    return (
      <div className={`${containerClass} py-24 text-center`}>
        <h1 className="font-display text-2xl text-ink">No hay un turno para mostrar</h1>
        <p className="mt-2 text-ink-soft">
          Elegí un servicio del catálogo para reservar tu turno.
        </p>
        <Link to="/servicios" className={`${primaryButtonClass} mt-6`}>
          Ver servicios
        </Link>
      </div>
    )
  }

  const date = parseDateKey(booking.date)

  return (
    <div className={`${containerClass} py-10`}>
      <div className="mx-auto max-w-2xl">
        <Stepper current={4} />

        <div className="mt-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose/25">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-rose-dark" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">¡Turno reservado!</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Te esperamos el <span className="text-ink">{formatLongDate(date)}</span> a las{" "}
            <span className="text-ink">{formatTime(booking.time)}</span>. Te confirmamos por WhatsApp
            al {booking.contact.phone}.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream-dark px-4 py-1.5 text-xs font-medium tracking-wide text-ink-soft">
            Código de turno: {bookingCode(booking)}
          </p>
        </div>

        <div className={`${cardClass} mt-10`}>
          <h2 className="font-display text-base font-semibold text-ink">Detalle de tu turno</h2>
          <div className="mt-4">
            <Row label="Servicio" value={service.name} />
            <Row label="Duración" value={formatDuration(service.durationMin)} />
            {service.professional && <Row label="Profesional" value={service.professional} />}
            <Row label="Día" value={formatLongDate(date)} />
            <Row label="Horario" value={formatTime(booking.time)} />
            <Row label="A nombre de" value={booking.contact.fullName} />
            <Row label="Teléfono" value={booking.contact.phone} />
            {booking.contact.email && <Row label="Email" value={booking.contact.email} />}
            <Row label="Total a abonar" value={formatPrice(service.price)} />
          </div>

          {booking.contact.notes && (
            <div className="mt-5 rounded-lg bg-cream-dark/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Tu comentario</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{booking.contact.notes}</p>
            </div>
          )}
        </div>

        <div className={`${cardClass} mt-5 bg-cream-dark/40`}>
          <h2 className="font-display text-sm font-semibold text-ink">Antes de venir</h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
            <li>· Llegá 5 minutos antes para no perder tiempo de sesión.</li>
            <li>· Si necesitás cancelar o reprogramar, avisanos con 24 hs de anticipación.</li>
            <li>· El pago se realiza en el local al finalizar el tratamiento.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/servicios" className={secondaryButtonClass}>
            Reservar otro turno
          </Link>
          <Link to="/" className={primaryButtonClass}>
            Volver al inicio
          </Link>
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-soft/70">
          Pantalla de demostración — el turno todavía no se guarda en ningún sistema.
        </p>
      </div>
    </div>
  )
}
