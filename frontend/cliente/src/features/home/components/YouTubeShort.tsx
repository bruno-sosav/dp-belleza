import { useState } from "react"

type Props = { id: string; title: string }

/**
 * Un short de YouTube que recién se carga al tocar play: hasta entonces es solo la
 * miniatura. Así la página no baja el reproductor de YouTube (pesado) de entrada.
 */
export default function YouTubeShort({ id, title }: Props) {
  const [reproduciendo, setReproduciendo] = useState(false)

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-ink shadow-[0_20px_45px_rgba(47,50,38,0.18)]">
      {reproduciendo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setReproduciendo(true)} aria-label={`Reproducir: ${title}`} className="group absolute inset-0">
          <img
            src={`https://i.ytimg.com/vi/${id}/oar2.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 ease-soft group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
          <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-forest shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-white">
            <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}
