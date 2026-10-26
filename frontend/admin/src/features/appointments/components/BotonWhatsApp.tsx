import IconoWhatsApp from "../../../shared/components/IconoWhatsApp"
import { whatsappCliente } from "../../../shared/lib/whatsapp"

/** Botón redondo verde que abre el chat con la clienta. Mismo tamaño que los botones de acción, para tocarlo fácil. */
export default function BotonWhatsApp({ telefono, nombre, mensaje }: { telefono: string; nombre: string; mensaje?: string }) {
  return (
    <a
      href={whatsappCliente(telefono, mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Escribirle a ${nombre} por WhatsApp`}
      aria-label={`Escribirle a ${nombre} por WhatsApp`}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white transition hover:bg-[#1da851]"
    >
      <IconoWhatsApp className="h-6 w-6" />
    </a>
  )
}
