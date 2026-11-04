import type { ReactNode } from "react"

type Props = {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  action?: ReactNode
}

export default function SectionHeader({ eyebrow, title, description, align = "left", action }: Props) {
  const centered = align === "center"

  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
        centered ? "sm:flex-col sm:items-center" : ""
      }`}
    >
      <div className={centered ? "text-center" : ""}>
        {eyebrow && (
          <p className="mb-4 inline-flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.3em] text-bark before:h-px before:w-7 before:bg-current before:opacity-60">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-medium leading-[1.08] text-ink">{title}</h2>
        {description && (
          <p
            className={`mt-3 text-[0.98rem] font-light leading-relaxed text-ink-soft ${
              centered ? "mx-auto max-w-xl" : "max-w-xl"
            }`}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
