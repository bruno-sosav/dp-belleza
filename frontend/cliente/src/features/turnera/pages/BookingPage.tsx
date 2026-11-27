import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toDateKey, useOpeningHours, useSlots } from "../api/disponibilidad.api"
import type { ConfirmedBooking, PaymentChoice } from "../api/reserva.api"
import { contactProblem, createBooking, emptyContact, recognizeClient, validDni } from "../api/reserva.api"
import { useService } from "../api/servicios.api"
import { useNegocio } from "../../../shared/lib/negocio"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import Calendar from "../components/Calendar"
import TimeSlotPicker from "../components/TimeSlotPicker"
import BookingForm from "../components/BookingForm"
import BookingSummary from "../components/BookingSummary"
import Field from "../components/Field"
import Stepper from "../components/Stepper"
import { InlineError, PageError, PageLoading } from "../components/LoadState"
import { formatLongDate, formatTime } from "../lib/format"
import { cardClass, containerClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"

/** Como en la web del psicólogo: DNI → (registro si es nueva) → pago → día y hora → confirmación. */
type Step = "dni" | "registro" | "pago" | "fecha" | "confirmar"
const STEPPER: Record<Step, number> = { dni: 1, registro: 1, pago: 2, fecha: 3, confirmar: 4 }

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-rose/50 bg-rose/10 px-5 py-4 text-sm text-ink" role="alert">
      {children}
    </div>
  )
}

function PaymentOption({ checked, onSelect, title, detail }: { checked: boolean; onSelect: () => void; title: string; detail: string }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded border p-5 transition ${
        checked ? "border-forest bg-forest/5 ring-2 ring-forest/20" : "border-ink/15 bg-surface hover:border-forest/50"
      }`}
    >
      <input type="radio" name="pago" checked={checked} onChange={onSelect} className="mt-1 accent-forest" />
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{detail}</span>
      </span>
    </label>
  )
}

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const service = useService(id)
  const hours = useOpeningHours()
  const negocio = useNegocio()

  const [step, setStep] = useState<Step>("dni")
  const [dni, setDni] = useState("")
  /** Nombre de la clienta si el DNI ya estaba registrado; null si es nueva. */
  const [knownName, setKnownName] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [dniError, setDniError] = useState<string | null>(null)
  const [contact, setContact] = useState(emptyContact)
  const [payment, setPayment] = useState<PaymentChoice | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  /** Aviso en día y hora cuando el horario elegido se ocupó mientras confirmaba. */
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
  const senaMonto = Math.max(1, Math.round((current.price * senaPorcentaje) / 100))
  // Sin seña configurada (o sin Mercado Pago) la única opción es efectivo: el paso se saltea.
  const afterIdentity = (): Step => (senaPorcentaje > 0 ? "pago" : "fecha")
  const chosenPayment: PaymentChoice = senaPorcentaje > 0 ? (payment ?? "efectivo") : "efectivo"
  const problem = contactProblem(contact)

  const checkDni = async () => {
    if (!validDni(dni)) {
      setDniError("Ingresá un DNI válido (7 u 8 números, sin puntos).")
      return
    }
    setChecking(true)
    setDniError(null)
    try {
      const nombre = await recognizeClient(dni)
      setKnownName(nombre)
      setStep(nombre ? afterIdentity() : "registro")
    } catch (err) {
      setDniError(err instanceof Error ? err.message : "No pudimos verificar el DNI. Probá de nuevo.")
    } finally {
      setChecking(false)
    }
  }

  const handleConfirm = async () => {
    if (!date || !time || sending) return
    setSending(true)
    setSendError(null)
    try {
      const booking = await createBooking({
        serviceId: current.id,
        date: toDateKey(date),
        time,
        dni,
        payment: chosenPayment,
        contact: knownName ? null : contact,
      })
      // Con seña, a pagar a Mercado Pago. Al volver, la web cae en /reserva/pago.
      if (booking.sena) {
        window.location.assign(booking.sena.link)
        return
      }
      const url = `/reserva-confirmada${booking.token ? `?t=${booking.token}` : ""}`
      // Clienta conocida: sus datos no están acá, la confirmación los pide con el token.
      if (knownName) navigate(url, { replace: true })
      else navigate(url, { state: { booking, service: current, contact } satisfies ConfirmedBooking, replace: true })
    } catch (err) {
      setSending(false)
      // 409: alguien reservó ese horario mientras ella confirmaba (o el local lo bloqueó).
      if (err instanceof ApiError && err.status === 409) {
        setSlotTaken(err.message)
        setTime(null)
        setStep("fecha")
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

  const nextIcon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const paymentNote =
    step === "dni" || step === "registro" || (step === "pago" && payment === null)
      ? undefined
      : chosenPayment === "sena"
        ? `Seña de ${formatPrice(senaMonto)} con Mercado Pago; el resto en el local.`
        : "Se abona en efectivo en el local."

  return (
    <div className={`${containerClass} py-10`}>
      <Link
        to={`/servicios/${current.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-leaf"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver al servicio
      </Link>

      <div className="mt-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Reservar turno</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {knownName ? `¡Hola, ${knownName}! Elegí cómo pagar y cuándo venir.` : "Ingresá tu DNI para empezar."}
        </p>
      </div>

      <div className="mt-8 max-w-2xl">
        <Stepper current={STEPPER[step]} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div>
          {step === "dni" && (
            <form
              className="max-w-md space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                void checkDni()
              }}
            >
              <section>
                <h2 className="font-display text-lg font-semibold text-ink">Identificación</h2>
                <p className="mt-2 text-sm text-ink-soft">Si ya viniste, te reconocemos y no tenés que cargar tus datos de nuevo.</p>
                <Field label="DNI" htmlFor="dni" required className="mt-5">
                  <input
                    id="dni"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej: 30111222"
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value)
                      setDniError(null)
                    }}
                    className={inputClass}
                  />
                </Field>
              </section>
              {dniError && <Alert>{dniError}</Alert>}
              <button type="submit" disabled={checking || !dni.trim()} className={`${primaryButtonClass} w-full sm:w-auto`}>
                {checking ? "Verificando…" : "Continuar"}
                {!checking && nextIcon}
              </button>
            </form>
          )}

          {step === "registro" && (
            <div className="space-y-8">
              <section>
                <h2 className="font-display text-lg font-semibold text-ink">Tus datos</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Es tu primera vez: completá tus datos una sola vez. Los usamos para confirmarte el turno y enviarte el recordatorio.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!problem) setStep(afterIdentity())
                  }}
                  className="mt-6"
                >
                  <BookingForm value={contact} onChange={setContact} />
                </form>
              </section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep("dni")} className={secondaryButtonClass}>
                  Volver
                </button>
                <button type="button" disabled={problem !== null} onClick={() => setStep(afterIdentity())} className={`${primaryButtonClass} flex-1`}>
                  Continuar
                  {nextIcon}
                </button>
              </div>
              {problem && <p className="text-xs text-ink-soft/80">{problem}</p>}
            </div>
          )}

          {step === "pago" && (
            <div className="space-y-8">
              <section>
                <h2 className="font-display text-lg font-semibold text-ink">¿Cómo querés pagar?</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <PaymentOption
                    checked={payment === "efectivo"}
                    onSelect={() => setPayment("efectivo")}
                    title="Efectivo"
                    detail="Pagás el total en el local, el día del turno."
                  />
                  <PaymentOption
                    checked={payment === "sena"}
                    onSelect={() => setPayment("sena")}
                    title="Seña con Mercado Pago"
                    detail={`Pagás ${formatPrice(senaMonto)} (${senaPorcentaje} %) ahora y el resto en el local.`}
                  />
                </div>
              </section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(knownName ? "dni" : "registro")} className={secondaryButtonClass}>
                  Volver
                </button>
                <button type="button" disabled={payment === null} onClick={() => setStep("fecha")} className={`${primaryButtonClass} flex-1`}>
                  Continuar
                  {nextIcon}
                </button>
              </div>
            </div>
          )}

          {step === "fecha" && (
            <div className="space-y-8">
              {slotTaken && <Alert>{slotTaken}</Alert>}

              <section>
                <h2 className="font-display text-lg font-semibold text-ink">1. Elegí el día</h2>
                <div className="mt-4 max-w-md">
                  <Calendar selected={date} onSelect={pickDate} hours={hours.data} maxDays={negocio?.reservaMaxDias} />
                </div>
              </section>

              <section>
                <h2 className="font-display text-lg font-semibold text-ink">2. Elegí el horario</h2>
                {date === null ? (
                  <div className="mt-4 rounded border border-dashed border-cream-dark bg-cream-dark/30 px-5 py-10 text-center">
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(senaPorcentaje > 0 ? "pago" : knownName ? "dni" : "registro")}
                  className={secondaryButtonClass}
                >
                  Volver
                </button>
                <button type="button" disabled={date === null || time === null} onClick={() => setStep("confirmar")} className={`${primaryButtonClass} flex-1`}>
                  Continuar
                  {nextIcon}
                </button>
              </div>
            </div>
          )}

          {step === "confirmar" && date && time && (
            <div className="space-y-8">
              <section>
                <h2 className="font-display text-lg font-semibold text-ink">Revisá y confirmá tu turno</h2>
                <dl className={`${cardClass} mt-5 space-y-3 text-sm`}>
                  {[
                    ["A nombre de", knownName ?? contact.fullName.trim()],
                    ...(knownName ? [] : [["Teléfono", contact.phone.trim()]]),
                    ["Servicio", current.name],
                    ["Día", formatLongDate(date)],
                    ["Horario", formatTime(time)],
                    ["Pago", chosenPayment === "sena" ? `Seña de ${formatPrice(senaMonto)} con Mercado Pago` : "Efectivo en el local"],
                    ["Total", formatPrice(current.price)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <dt className="text-ink-soft">{label}</dt>
                      <dd className="text-right font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {chosenPayment === "sena" && (
                <div className="rounded border border-cream-dark bg-cream-dark/40 px-5 py-4 text-sm text-ink">
                  <p className="font-medium">Al confirmar te llevamos a Mercado Pago para pagar la seña.</p>
                  <p className="mt-1 text-ink-soft">Tenés 30 minutos para pagarla; si no, el horario se libera.</p>
                </div>
              )}

              {sendError && <Alert>{sendError}</Alert>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep("fecha")} disabled={sending} className={secondaryButtonClass}>
                  Volver
                </button>
                <button type="button" disabled={sending} onClick={() => void handleConfirm()} className={`${primaryButtonClass} flex-1`}>
                  {sending
                    ? chosenPayment === "sena"
                      ? "Yendo a Mercado Pago…"
                      : "Reservando…"
                    : chosenPayment === "sena"
                      ? "Pagar la seña y reservar"
                      : "Confirmar turno"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            Resumen del turno
          </p>
          <BookingSummary service={current} date={date} time={time} paymentNote={paymentNote} />
        </aside>
      </div>
    </div>
  )
}
