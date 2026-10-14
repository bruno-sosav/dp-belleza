const steps = ["Servicio", "Día y hora", "Tus datos", "Listo"]

export default function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const step = i + 1
        const isDone = step < current
        const isActive = step === current

        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isActive
                    ? "bg-ink text-cream ring-4 ring-rose/30"
                    : isDone
                      ? "bg-rose text-white"
                      : "border border-cream-dark bg-surface text-ink-soft/60"
                }`}
              >
                {isDone ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step
                )}
              </span>
              <span
                className={`hidden text-xs font-medium tracking-wide sm:block ${
                  isActive ? "text-ink" : "text-ink-soft/70"
                }`}
              >
                {label}
              </span>
            </div>

            {step < steps.length && (
              <span
                className={`h-px flex-1 transition ${isDone ? "bg-rose" : "bg-cream-dark"}`}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
