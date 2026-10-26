import type { Service } from "@dp/shared/types/servicio.types"

type Props = {
  service: Service
  className: string
  loading?: "lazy" | "eager"
}

/** Foto del servicio o, si no tiene, un bloque con la inicial del mismo tamaño. */
export default function ServiceImage({ service, className, loading }: Props) {
  if (service.image) {
    return <img src={service.image} alt={service.name} loading={loading} className={`${className} object-cover`} />
  }
  return (
    <div
      role="img"
      aria-label={service.name}
      className={`${className} flex items-center justify-center bg-cream-dark font-display text-4xl text-rose-dark/60`}
    >
      {service.name.charAt(0)}
    </div>
  )
}
