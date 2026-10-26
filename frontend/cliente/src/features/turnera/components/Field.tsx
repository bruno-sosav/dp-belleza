import type { ReactNode } from "react"

type Props = {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

export default function Field({ label, htmlFor, required, hint, className = "", children }: Props) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
        {required ? <span className="ml-0.5 text-rose-dark">*</span> : <span className="ml-1 normal-case text-ink-soft/60">(opcional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-soft/70">{hint}</p>}
    </div>
  )
}
