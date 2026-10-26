import type { Service } from "@dp/shared/data/services"

type Props = {
  service: Service
  className: string
  loading?: "lazy" | "eager"
}

/**
 * Foto del servicio. La foto es opcional en el panel: si la dueña no cargó una,
 * se muestra un bloque del mismo tamaño con la inicial, para que la grilla no
 * quede desarmada.
 */
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
