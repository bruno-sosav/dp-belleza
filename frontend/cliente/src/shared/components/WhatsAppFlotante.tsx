import { whatsappUrl } from "../../features/home/lib/whatsapp"
import { useNegocio } from "../lib/negocio"
import { IconoWhatsApp } from "./Iconos"

const MENSAJE = "¡Hola Dani! Te escribo desde la página de dppuntobelleza."

/** Botón fijo abajo a la derecha que abre el WhatsApp del local. Si no hay número cargado, no aparece. */
export default function WhatsAppFlotante() {
  const telefono = useNegocio()?.telefono
  if (!telefono) return null

  return (
    <a
      href={whatsappUrl(telefono, MENSAJE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      title="Escribinos por WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_25px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <IconoWhatsApp className="h-7 w-7" />
    </a>
  )
}
