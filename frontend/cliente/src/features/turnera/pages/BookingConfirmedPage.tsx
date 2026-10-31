import { useCallback } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import type { ConfirmedBooking } from "../api/reserva.api"
import { bookingCode, fetchConfirmedBooking } from "../api/reserva.api"
import { useApi } from "../../../shared/lib/useApi"
import { PageLoading } from "../components/LoadState"
import { textoCancelacion } from "../api/miTurno.api"
import { useNegocio } from "../../../shared/lib/negocio"
import { parseDateKey } from "../api/disponibilidad.api"
import { formatPrice } from "@dp/shared/lib/format"
import { formatDuration, formatLongDate, formatTime } from "../lib/format"
import Stepper from "../components/Stepper"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-dark py-3 text-sm last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}

/** Turno reservado. Los datos llegan por `state`; si se recarga, se piden con el token de la URL. */
export default function BookingConfirmedPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const token = params.get("t")
  const enState = location.state as ConfirmedBooking | null
  const pedir = useCallback(
    () => (enState || !token ? Promise.resolve(enState) : fetchConfirmedBooking(token)),
    [enState, token],
  )
  const carga = useApi(pedir)
  const confirmed = enState ?? carga.data
  const negocio = useNegocio()

  if (!confirmed && carga.loading) return <PageLoading />

  if (!confirmed) {
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

  const { booking, service, contact } = confirmed
  const date = parseDateKey(booking.fecha)

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
            <span className="text-ink">{formatTime(booking.horaInicio)}</span>. Te confirmamos por WhatsApp
            al {contact.phone}.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream-dark px-4 py-1.5 text-xs font-medium tracking-wide text-ink-soft">
            Código de turno: {bookingCode(booking.id)}
          </p>
        </div>

        <div className={`${cardClass} mt-10`}>
          <h2 className="font-display text-base font-semibold text-ink">Detalle de tu turno</h2>
          <div className="mt-4">
            <Row label="Servicio" value={service.name} />
            <Row label="Duración" value={formatDuration(service.durationMin)} />
            {service.professional && <Row label="Profesional" value={service.professional} />}
            <Row label="Día" value={formatLongDate(date)} />
            <Row label="Horario" value={formatTime(booking.horaInicio)} />
            <Row label="A nombre de" value={contact.fullName} />
            <Row label="Teléfono" value={contact.phone} />
            {contact.email && <Row label="Email" value={contact.email} />}
            <Row label="Total a abonar" value={formatPrice(booking.precio)} />
          </div>

          {contact.notes && (
            <div className="mt-5 rounded-lg bg-cream-dark/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Tu comentario</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{contact.notes}</p>
            </div>
          )}
        </div>

        <div className={`${cardClass} mt-5 bg-cream-dark/40`}>
          <h2 className="font-display text-sm font-semibold text-ink">Antes de venir</h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
            <li>· Llegá 5 minutos antes para no perder tiempo de sesión.</li>
            <li>
              · Si no podés venir, cancelalo en{" "}
              <Link
                to="/mi-turno"
                state={{ codigo: bookingCode(booking.id), telefono: contact.phone }}
                className="font-medium text-rose-dark underline"
              >
                Mi turno
              </Link>{" "}
              con tu código{negocio ? `, ${textoCancelacion(negocio.cancelacionHoras)}` : ""}.
            </li>
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
      </div>
    </div>
  )
}
