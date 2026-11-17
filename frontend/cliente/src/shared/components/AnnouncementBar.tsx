import { formatPrice } from "@dp/shared/lib/format"
import { useNegocio, type Negocio } from "../lib/negocio"

/** Lo que se dice del envío sale de Ajustes → Envíos, así nunca promete algo que la tienda no cobra igual. */
function mensajeDeEnvio(n: Negocio | null) {
  if (!n) return "Tienda online de dppuntobelleza"
  if (!n.envios) return "Comprá online y retirá en el local"
  return n.envioGratisDesde > 0 ? `Envío gratis en compras desde ${formatPrice(n.envioGratisDesde)}` : "Envíos a todo el país con Andreani"
}

function MarqueeGroup({ message }: { message: string }) {
  return (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="shrink-0">
          {message}
        </span>
      ))}
    </div>
  )
}

export default function AnnouncementBar() {
  const message = `${mensajeDeEnvio(useNegocio())} · 3 cuotas sin interés`
  return (
    <div className="overflow-hidden bg-forest py-1.5 font-medium tracking-[0.08em] text-cream/90">
      <div className="marquee flex w-max">
        <MarqueeGroup message={message} />
        <MarqueeGroup message={message} />
      </div>
    </div>
  )
}
