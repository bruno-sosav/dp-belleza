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
    <div className="overflow-hidden bg-forest py-1.5 font-medium tracking-[0.08em] text-cream/90">
      <div className="marquee flex w-max">
        <MarqueeGroup />
        <MarqueeGroup />
      </div>
    </div>
  )
}
