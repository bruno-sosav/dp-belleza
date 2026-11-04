type Photo = { src: string; alt: string }

/** Segundos que tarda cada foto en cruzar; con más fotos, la tira tarda más en dar la vuelta. */
const SECONDS_PER_PHOTO = 9

/**
 * Tira de fotos que se desliza sola y sin parar, de borde a borde de la pantalla.
 * La lista va tres veces seguidas y la animación corre un tercio: cuando
 * termina, la imagen es idéntica a la del principio y el loop no se nota.
 */
export default function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const strip = [...photos, ...photos, ...photos]

  return (
    <div aria-label="Fotos del consultorio" className="overflow-hidden">
      <div
        className="dp-photo-strip flex w-max"
        style={{ animationDuration: `${photos.length * SECONDS_PER_PHOTO}s` }}
      >
        {strip.map((photo, i) => (
          // El espacio va como padding (no gap) para que los tres tramos midan exactamente lo mismo.
          <div key={`${photo.src}-${i}`} aria-hidden={i >= photos.length} className="shrink-0 pr-3 sm:pr-4">
            <img
              src={photo.src}
              alt={i < photos.length ? photo.alt : ""}
              loading="lazy"
              className="aspect-[4/5] w-[260px] rounded object-cover sm:w-[320px] lg:w-[380px]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
