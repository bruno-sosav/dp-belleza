import { Link } from "react-router-dom"

type Props = {
  /** Texto claro, para usar sobre fotos o fondos oscuros. */
  light?: boolean
  /** Muestra "estética & bienestar" debajo del nombre, como en el logo completo. */
  tagline?: boolean
  className?: string
}

/** Logo de la marca: el círculo oliva con el tulipán y el nombre en la letra del logo. */
export default function Brand({ light = false, tagline = false, className = "" }: Props) {
  return (
    <Link to="/" aria-label="dppuntobelleza, ir al inicio" className={`flex items-center gap-3 ${className}`}>
      <img src="/logo/logo-circulo.png" alt="" className="h-10 w-10 shrink-0 rounded-full" />
      <span className="flex flex-col leading-none">
        <span className={`font-brand text-[1.35rem] tracking-[0.01em] transition-colors ${light ? "text-white" : "text-ink"}`}>
          dppuntobelleza
        </span>
        {tagline && (
          <span className={`mt-1.5 font-brand text-[0.62rem] tracking-[0.18em] ${light ? "text-sand" : "text-bark"}`}>
            estética & bienestar
          </span>
        )}
      </span>
    </Link>
  )
}
