const MESSAGE = "Envío gratis en compras superiores a $30.000 · 3 cuotas sin interés"

function MarqueeGroup() {
  return (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="shrink-0">
          {MESSAGE}
        </span>
      ))}
    </div>
  )
}

export default function AnnouncementBar() {
  return (
    <div className="overflow-hidden bg-ink py-2 text-cream">
      <div className="marquee flex w-max">
        <MarqueeGroup />
        <MarqueeGroup />
      </div>
    </div>
  )
}
