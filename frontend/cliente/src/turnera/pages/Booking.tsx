import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { getServiceById } from "../data/services"
import { getSlotsForDate, toDateKey } from "../data/availability"
import type { BookingRequest } from "../data/booking"
import { emptyContact, isContactComplete } from "../data/booking"
import Calendar from "../components/Calendar"
import TimeSlotPicker from "../components/TimeSlotPicker"
import BookingForm from "../components/BookingForm"
import BookingSummary from "../components/BookingSummary"
import Stepper from "../components/Stepper"
import { formatLongDate, formatTime } from "../lib/format"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

export default function Booking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const service = id ? getServiceById(id) : undefined

  const [step, setStep] = useState<2 | 3>(2)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [contact, setContact] = useState(emptyContact)

  const slots = useMemo(
    () => (date && service ? getSlotsForDate(date, service.durationMin) : []),
    [date, service]
  )

  if (!service) {
    return (
      <div className={`${containerClass} py-24 text-center`}>
        <h1 className="font-display text-2xl text-ink">No encontramos ese servicio</h1>
        <p className="mt-2 text-ink-soft">Elegí uno del catálogo para reservar tu turno.</p>
        <Link to="/servicios" className={`${primaryButtonClass} mt-6`}>
          Ver servicios
        </Link>
      </div>
    )
  }

  const canContinue = date !== null && time !== null
  const canConfirm = canContinue && isContactComplete(contact)

  /** Visual: no se envía nada, solo pasamos los datos a la pantalla de confirmación. */
  const handleConfirm = () => {
    if (!canConfirm || !date || !time) return

    const booking: BookingRequest = {
      serviceId: service.id,
      date: toDateKey(date),
      time,
      contact,
    }

    navigate("/reserva-confirmada", { state: booking })
  }

  const pickDate = (next: Date) => {
    setDate(next)
    setTime(null)
  }

  return (
    <div className={`${containerClass} py-10`}>
      <Link
        to={`/servicios/${service.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-rose-dark"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver al servicio
      </Link>

      <div className="mt-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Reservar turno</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Elegí el día y el horario, dejanos tus datos y listo.
        </p>
      </div>

      <div className="mt-8 max-w-2xl">
        <Stepper current={step} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div>
          {step === 2 ? (
            <div className="space-y-8">
              <section>
                <h2 className="font-display text-lg font-semibold text-ink">1. Elegí el día</h2>
                <div className="mt-4 max-w-md">
                  <Calendar selected={date} onSelect={pickDate} />
                </div>
              </section>

              <section>
                <h2 className="font-display text-lg font-semibold text-ink">2. Elegí el horario</h2>
                {date === null ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-cream-dark bg-cream-dark/30 px-5 py-10 text-center">
                    <p className="text-sm text-ink-soft">Primero seleccioná un día en el calendario.</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-ink-soft">
                      Horarios disponibles para el <span className="text-ink">{formatLongDate(date)}</span>
                    </p>
                    <div className="mt-4">
                      <TimeSlotPicker slots={slots} selected={time} onSelect={setTime} />
                    </div>
                  </>
                )}
              </section>

              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep(3)}
                className={`${primaryButtonClass} w-full sm:w-auto`}
              >
                Continuar con mis datos
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 bg-cream-dark/40`}>
                <div className="text-sm">
                  <p className="font-medium text-ink">
                    {date && formatLongDate(date)} · {time && formatTime(time)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">Turno seleccionado</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-sm font-medium text-rose-dark underline transition hover:text-ink"
                >
                  Cambiar
                </button>
              </div>

              <section>
                <h2 className="font-display text-lg font-semibold text-ink">3. Tus datos</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Los usamos solo para confirmarte el turno y enviarte el recordatorio.
                </p>
                <form onSubmit={(e) => e.preventDefault()} className="mt-6">
                  <BookingForm value={contact} onChange={setContact} />
                </form>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(2)} className={secondaryButtonClass}>
                  Volver
                </button>
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                  className={`${primaryButtonClass} flex-1`}
                >
                  Confirmar turno
                </button>
              </div>

              {!canConfirm && (
                <p className="text-xs text-ink-soft/80">
                  Completá al menos tu nombre y tu teléfono para confirmar.
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            Resumen del turno
          </p>
          <BookingSummary service={service} date={date} time={time} />
        </aside>
      </div>
    </div>
  )
}
