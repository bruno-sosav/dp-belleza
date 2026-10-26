import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toDateKey, useOpeningHours, useSlots } from "../api/disponibilidad.api"
import type { ConfirmedBooking } from "../api/reserva.api"
import { contactProblem, createBooking, emptyContact } from "../api/reserva.api"
import { useService } from "../api/servicios.api"
import { useNegocio } from "../../../shared/lib/negocio"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../lib/api"
import Calendar from "../components/Calendar"
import TimeSlotPicker from "../components/TimeSlotPicker"
import BookingForm from "../components/BookingForm"
import BookingSummary from "../components/BookingSummary"
import Stepper from "../components/Stepper"
import { InlineError, PageError, PageLoading } from "../components/LoadState"
import { formatLongDate, formatTime } from "../lib/format"
import { cardClass, containerClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const service = useService(id)
  const hours = useOpeningHours()
  const negocio = useNegocio()

  const [step, setStep] = useState<2 | 3>(2)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [contact, setContact] = useState(emptyContact)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  /** Aviso en el paso 2 cuando el horario elegido se ocupó mientras completaba los datos. */
  const [slotTaken, setSlotTaken] = useState<string | null>(null)

  const slots = useSlots(service.data?.id, date)

  if (service.error) return <PageError message={service.error} onRetry={service.reload} />
  if (hours.error) return <PageError message={hours.error} onRetry={hours.reload} />
  if (service.loading || hours.loading || !hours.data) return <PageLoading />

  if (!service.data) {
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

  const current = service.data
  const senaPorcentaje = negocio?.senaPorcentaje ?? 0
  const problem = contactProblem(contact)
  const canContinue = date !== null && time !== null
  const canConfirm = canContinue && problem === null && !sending

  const handleConfirm = async () => {
    if (!canConfirm || !date || !time) return
    setSending(true)
    setSendError(null)
    try {
      const booking = await createBooking({ serviceId: current.id, date: toDateKey(date), time, contact })
      // Con seña, a pagar a Mercado Pago. Al volver, la web cae en /reserva/pago.
      if (booking.sena) {
        window.location.assign(booking.sena.link)
        return
      }
      const state: ConfirmedBooking = { booking, service: current, contact }
      // El token en la URL hace que la confirmación sobreviva a un F5; el state la muestra al instante.
      navigate(`/reserva-confirmada${booking.token ? `?t=${booking.token}` : ""}`, { state, replace: true })
    } catch (err) {
      setSending(false)
      // 409: alguien reservó ese horario mientras ella completaba los datos (o
      // el local lo bloqueó). Se la devuelve a elegir con la grilla actualizada.
      if (err instanceof ApiError && err.status === 409) {
        setSlotTaken(err.message)
        setTime(null)
        setStep(2)
        slots.reload()
        return
      }
      setSendError(err instanceof Error ? err.message : "No pudimos reservar el turno. Probá de nuevo.")
    }
  }

  const pickDate = (next: Date) => {
    setDate(next)
    setTime(null)
    setSlotTaken(null)
  }

  const pickTime = (next: string) => {
    setTime(next)
    setSlotTaken(null)
  }

  return (
    <div className={`${containerClass} py-10`}>
      <Link
        to={`/servicios/${current.id}`}
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
              {slotTaken && (
                <div className="rounded-2xl border border-rose/50 bg-rose/10 px-5 py-4 text-sm text-ink" role="alert">
                  {slotTaken}
                </div>
              )}

              <section>
                <h2 className="font-display text-lg font-semibold text-ink">1. Elegí el día</h2>
                <div className="mt-4 max-w-md">
                  <Calendar selected={date} onSelect={pickDate} hours={hours.data} maxDays={negocio?.reservaMaxDias} />
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
                      {slots.error ? (
                        <InlineError message={slots.error} onRetry={slots.reload} />
                      ) : slots.loading ? (
                        <p className="py-10 text-center text-sm text-ink-soft">Buscando horarios libres…</p>
                      ) : (
                        <TimeSlotPicker slots={slots.data ?? []} selected={time} onSelect={pickTime} />
                      )}
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
                  disabled={sending}
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleConfirm()
                  }}
                  className="mt-6"
                >
                  <BookingForm value={contact} onChange={setContact} />
                </form>
              </section>

              {senaPorcentaje > 0 && (
                <div className="rounded-2xl border border-cream-dark bg-cream-dark/40 px-5 py-4 text-sm text-ink">
                  <p className="font-medium">
                    Para confirmar el turno pagás una seña de {formatPrice(Math.max(1, Math.round((current.price * senaPorcentaje) / 100)))} ({senaPorcentaje} %) con Mercado Pago.
                  </p>
                  <p className="mt-1 text-ink-soft">
                    El resto lo abonás en el local. Tenés 30 minutos para pagarla; si no, el horario se libera.
                  </p>
                </div>
              )}

              {sendError && (
                <div className="rounded-2xl border border-rose/50 bg-rose/10 px-5 py-4 text-sm text-ink" role="alert">
                  {sendError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(2)} disabled={sending} className={secondaryButtonClass}>
                  Volver
                </button>
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() => void handleConfirm()}
                  className={`${primaryButtonClass} flex-1`}
                >
                  {sending ? (senaPorcentaje > 0 ? "Yendo a Mercado Pago…" : "Reservando…") : senaPorcentaje > 0 ? "Pagar la seña y reservar" : "Confirmar turno"}
                </button>
              </div>

              {problem && <p className="text-xs text-ink-soft/80">{problem}</p>}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            Resumen del turno
          </p>
          <BookingSummary service={current} date={date} time={time} />
        </aside>
      </div>
    </div>
  )
}
