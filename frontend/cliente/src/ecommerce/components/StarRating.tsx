export default function StarRating({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-rose">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.round(rating)
          return (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={filled ? 0 : 1.2}
            >
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6L10 14.9 4.6 17.8l1.3-6-4.6-4.1 6.1-.6L10 1.5z" />
            </svg>
          )
        })}
      </div>
      {reviews !== undefined && (
        <span className="text-xs text-ink-soft">({reviews})</span>
      )}
    </div>
  )
}
