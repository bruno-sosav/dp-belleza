import type { ReactNode } from "react"

/** Íconos de línea del panel, con el mismo trazo que los del menú. Reemplazan a los emojis. */
const trazos = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  cruz: <path d="M6 6l12 12M18 6L6 18" />,
  lapiz: <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" />,
  tacho: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alerta: <path d="M12 4L2.5 20h19L12 4zM12 10v4.5M12 17.5v.01" />,
  tarjeta: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  billete: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  banco: <path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  celular: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  torta: <path d="M4 20h16M5 20v-6a2 2 0 012-2h10a2 2 0 012 2v6M5 15.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0M12 12V8M12 5.5v.01" />,
  pausa: <path d="M9 5v14M15 5v14" />,
  bloqueo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  repetir: <path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" />,
  mensaje: <path d="M4 5h16v11H8l-4 4V5zM8 9h8M8 12h5" />,
} satisfies Record<string, ReactNode>

export type NombreIcono = keyof typeof trazos

export default function Icono({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazos[nombre]}
    </svg>
  )
}
