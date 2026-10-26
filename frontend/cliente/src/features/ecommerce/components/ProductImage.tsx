import { useState } from "react"

/** Foto del producto. Si no tiene (es opcional en el panel) o el link no carga, un recuadro con el nombre. */
export default function ProductImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  const [rota, setRota] = useState<string | null>(null)

  if (!src || rota === src) {
    return (
      <div className={`flex items-center justify-center bg-cream-dark p-3 text-center font-display text-sm text-ink-soft ${className}`}>
        {alt}
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setRota(src)} className={`object-cover ${className}`} />
}
