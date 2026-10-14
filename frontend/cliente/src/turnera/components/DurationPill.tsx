import { formatDuration } from "../lib/format"

export default function DurationPill({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-dark/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v4.5l3 1.8" strokeLinecap="round" />
      </svg>
      {formatDuration(minutes)}
    </span>
  )
}
