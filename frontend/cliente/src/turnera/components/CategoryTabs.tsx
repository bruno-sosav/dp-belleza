import type { ServiceCategory } from "../data/services"

type Props = {
  categories: ServiceCategory[]
  active: ServiceCategory | null
  onChange: (category: ServiceCategory | null) => void
}

export default function CategoryTabs({ categories, active, onChange }: Props) {
  const baseClass =
    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap"

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`${baseClass} ${
          active === null
            ? "border-ink bg-ink text-cream"
            : "border-cream-dark bg-surface text-ink-soft hover:border-rose hover:text-rose-dark"
        }`}
      >
        Todos
      </button>

      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={`${baseClass} ${
            active === category
              ? "border-ink bg-ink text-cream"
              : "border-cream-dark bg-surface text-ink-soft hover:border-rose hover:text-rose-dark"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
