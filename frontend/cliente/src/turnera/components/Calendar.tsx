import { useState } from "react"
import {
  isSameDay,
  isSelectable,
  monthLabels,
  startOfToday,
  weekDayLabels,
} from "../data/availability"

type Props = {
  selected: Date | null
  onSelect: (date: Date) => void
}

export default function Calendar({ selected, onSelect }: Props) {
  const today = startOfToday()
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()

  /** Lunes primero: convertimos el domingo (0) en 6. */
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const orderedWeekDays = [...weekDayLabels.slice(1), weekDayLabels[0]]

  const changeMonth = (delta: number) => setView(new Date(year, month + delta, 1))

  return (
    <div className="rounded-2xl border border-cream-dark bg-surface p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={isCurrentMonth}
          aria-label="Mes anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-dark text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-cream-dark"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="font-display text-base font-semibold text-ink">
          {monthLabels[month]} {year}
        </p>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-dark text-ink-soft transition hover:border-ink hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M10 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center">
        {orderedWeekDays.map((day) => (
          <span key={day} className="pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/60">
            {day}
          </span>
        ))}

        {Array.from({ length: firstWeekDay }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(year, month, i + 1)
          const selectable = isSelectable(date)
          const isSelected = selected !== null && isSameDay(date, selected)
          const isToday = isSameDay(date, today)

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(date)}
              aria-current={isSelected ? "date" : undefined}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-sm transition ${
                isSelected
                  ? "bg-ink font-semibold text-cream"
                  : selectable
                    ? "text-ink hover:bg-rose/20"
                    : "cursor-not-allowed text-ink-soft/25 line-through"
              }`}
            >
              {i + 1}
              {isToday && !isSelected && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-rose-dark" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-4 border-t border-cream-dark pt-3 text-[11px] leading-relaxed text-ink-soft/80">
        Domingos cerrado. Sábados atendemos de 10 a 15 hs.
      </p>
    </div>
  )
}
