import { Link } from "react-router-dom"
import { datosDeContacto, useNegocio } from "../lib/negocio"
import Brand from "./Brand"

const titleClass = "text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-ink-soft/70"
const linkClass = "text-sm font-light text-ink-soft transition hover:text-ink"

// Fuera del componente: render puro (el año no cambia mientras la página está abierta).
const ANIO = new Date().getFullYear()

export default function Footer() {
  const negocio = useNegocio()
  return (
    <footer className="mt-auto border-t border-ink/10 bg-cream-dark">
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-9 sm:px-10">
        <div className="flex flex-col flex-wrap justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <Brand tagline />
            <p className="mt-4 text-sm font-light leading-relaxed text-ink-soft">
              Consultorio de estética y bienestar. Un lugar de confianza, dedicación y cuidado para tu piel.
            </p>
            <div className="mt-5 flex gap-2.5">
              {["Instagram", "Facebook", "TikTok"].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={s}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-soft transition hover:border-olive hover:text-olive"
                >
                  <span className="text-xs">{s[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            <li className={titleClass}>Turnos</li>
            <li><Link to="/servicios" className={linkClass}>Servicios</Link></li>
            <li><Link to="/mi-turno" className={linkClass}>Mi turno</Link></li>
            <li><Link to="/#nosotros" className={linkClass}>Nosotros</Link></li>
          </ul>

          <ul className="flex flex-col gap-3">
            <li className={titleClass}>Tienda</li>
            <li><Link to="/tienda" className={linkClass}>Todos los productos</Link></li>
            <li><Link to="/gift-cards" className={linkClass}>Gift cards</Link></li>
            <li><Link to="/carrito" className={linkClass}>Carrito</Link></li>
            <li><Link to="/contacto" className={linkClass}>Contacto</Link></li>
          </ul>

          <ul className="flex flex-col gap-3">
            <li className={titleClass}>Visitanos</li>
            {datosDeContacto(negocio).map((d) => (
              <li key={d.label} className="max-w-[16rem] text-sm font-light text-ink-soft">
                {d.value}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-ink/10 pt-6 text-xs font-light text-ink-soft/80 sm:flex-row sm:items-center">
          <p>
            © {ANIO} dppuntobelleza
            <span className="mx-2 inline-block h-[3px] w-[3px] rounded-full bg-olive/40 align-middle" />
            Todos los derechos reservados
          </p>
          <p>Proyecto en desarrollo — frontend de demostración</p>
        </div>
      </div>
    </footer>
  )
}
