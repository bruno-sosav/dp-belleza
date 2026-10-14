import type { TimeSlot } from "../data/availability"
import { slotPeriod } from "../data/availability"

type Props = {
  slots: TimeSlot[]
  selected: string | null
  onSelect: (time: string) => void
}

const periods = ["Mañana", "Tarde", "Noche"] as const

export default function TimeSlotPicker({ slots, selected, onSelect }: Props) {
  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-dark bg-cream-dark/30 px-5 py-10 text-center">
        <p className="text-sm text-ink-soft">No hay horarios disponibles para este día.</p>
        <p className="mt-1 text-xs text-ink-soft/70">Probá con otra fecha del calendario.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {periods.map((period) => {
        const periodSlots = slots.filter((slot) => slotPeriod(slot.time) === period)
        if (periodSlots.length === 0) return null

        return (
          <div key={period}>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-soft/70">{period}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {periodSlots.map((slot) => {
                const isSelected = slot.time === selected

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onSelect(slot.time)}
                    className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                      isSelected
                        ? "border-ink bg-ink text-cream"
                        : slot.available
                          ? "border-cream-dark bg-surface text-ink hover:border-rose hover:bg-rose/10"
                          : "cursor-not-allowed border-transparent bg-cream-dark/40 text-ink-soft/35 line-through"
                    }`}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-4 border-t border-cream-dark pt-4 text-[11px] text-ink-soft/80">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-cream-dark bg-surface" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-ink" />
          Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-cream-dark" />
          Ocupado
        </span>
      </div>
    </div>
  )
}
