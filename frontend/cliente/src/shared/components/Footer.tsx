import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer className="border-t border-cream-dark bg-cream-dark/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="font-display text-2xl font-semibold text-ink">
              Dp.belleza
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              Tratamientos de estética y cosmética seleccionada para cuidarte en cabina y en casa.
            </p>
            <div className="mt-5 flex gap-3">
              {["Instagram", "Facebook", "TikTok"].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={s}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-soft transition hover:border-rose hover:text-rose"
                >
                  <span className="text-xs">{s[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Tienda</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              <li><Link to="/tienda" className="hover:text-rose">Todos los productos</Link></li>
              <li><Link to="/tienda" className="hover:text-rose">Novedades</Link></li>
              <li><Link to="/tienda" className="hover:text-rose">Ofertas</Link></li>
              <li><Link to="/tienda" className="hover:text-rose">Más vendidos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Ayuda</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              <li><Link to="/contacto" className="hover:text-rose">Contacto</Link></li>
              <li><span className="cursor-default">Envíos y devoluciones</span></li>
              <li><span className="cursor-default">Preguntas frecuentes</span></li>
              <li><span className="cursor-default">Términos y condiciones</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Contacto</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              <li>hola@dpbelleza.com</li>
              <li>+54 11 1234-5678</li>
              <li>Av. Siempre Viva 1234, Buenos Aires</li>
              <li>Lunes a viernes de 9 a 18hs</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink/10 pt-6 text-xs text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} Dp.belleza. Todos los derechos reservados.</p>
          <p>Proyecto en desarrollo — frontend de demostración</p>
        </div>
      </div>
    </footer>
  )
}
