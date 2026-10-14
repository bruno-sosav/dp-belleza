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
        {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-rose-dark">{eyebrow}</p>}
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
        {description && (
          <p className={`mt-3 text-sm leading-relaxed text-ink-soft ${centered ? "mx-auto max-w-xl" : "max-w-xl"}`}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
