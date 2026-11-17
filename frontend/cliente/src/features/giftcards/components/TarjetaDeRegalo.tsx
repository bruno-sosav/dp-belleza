import { formatPrice } from "@dp/shared/lib/format"

/** La gift card dibujada: el monto, para quién, el mensaje y (si ya está pagada) el código. */
export default function TarjetaDeRegalo({ monto, para, mensaje, codigo }: { monto: number | null; para?: string | null; mensaje?: string | null; codigo?: string | null }) {
  return (
    <div className="relative aspect-[1.6] w-full max-w-md overflow-hidden rounded-2xl bg-forest p-6 text-left text-cream shadow-lg sm:p-8">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose/30" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-leaf/30" aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cream/80">Gift card</p>
          <p className="mt-1 font-display text-2xl font-semibold">DP Belleza</p>
        </div>
        <div>
          {para?.trim() && <p className="text-sm text-cream/90">Para {para.trim()}</p>}
          {mensaje?.trim() && <p className="mt-1 line-clamp-2 text-sm italic text-cream/80">“{mensaje.trim()}”</p>}
        </div>
        <div className="flex items-end justify-between gap-4">
          <p className="font-display text-3xl font-semibold">{monto ? formatPrice(monto) : "—"}</p>
          {codigo && <p className="rounded bg-cream/15 px-2 py-1 font-mono text-sm tracking-widest">{codigo}</p>}
        </div>
      </div>
    </div>
  )
}
