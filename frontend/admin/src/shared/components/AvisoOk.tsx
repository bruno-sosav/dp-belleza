import type { ReactNode } from "react"
import Icono from "./Icono"

/** "Guardado", "Listo…": el aviso de que algo salió bien, siempre igual en todo el panel. */
export default function AvisoOk({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={`flex items-start gap-2 text-base font-medium text-exito ${className}`}>
      <Icono nombre="check" className="mt-0.5 h-5 w-5" />
      <span>{children}</span>
    </p>
  )
}
