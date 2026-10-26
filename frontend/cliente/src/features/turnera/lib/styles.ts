/**
 * Clases Tailwind reutilizadas del módulo de turnos.
 *
 * El proyecto usa Tailwind con clases inline, pero los patrones que se repiten
 * viven acá para no copiarlos en cada componente: si cambia el estilo del input
 * o del botón primario, se cambia en un solo lugar.
 */

export const inputClass =
  "w-full rounded-lg border border-cream-dark bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-rose focus:ring-2 focus:ring-rose/25"

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark disabled:cursor-not-allowed disabled:bg-ink/30"

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"

export const cardClass = "rounded-2xl border border-cream-dark bg-surface p-5 sm:p-6"

export const containerClass = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
