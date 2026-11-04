import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center sm:px-6 lg:px-8">
      <p className="font-display text-8xl font-medium italic text-leaf/40">404</p>
      <h1 className="mt-4 font-display text-4xl font-medium text-ink">Página no encontrada</h1>
      <p className="mt-2 text-ink-soft">La página que buscás no existe o fue movida.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-sm bg-forest px-7 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
