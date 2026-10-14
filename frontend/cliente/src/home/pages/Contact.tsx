import { useState } from "react"
import type { FormEvent } from "react"
import { whatsappUrl } from "../lib/whatsapp"

const inputClass =
  "w-full rounded-md border border-cream-dark px-3 py-2.5 text-sm outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/25"

export default function Contact() {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const canSend = name.trim() !== "" && message.trim() !== ""

  // El formulario no envía nada a un servidor: abre WhatsApp con el mensaje armado
  // y la persona solo tiene que tocar "Enviar" en el chat.
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return

    const lines = [`Hola Dp.belleza! Soy ${name.trim()}.`]
    if (subject.trim()) lines.push(`Asunto: ${subject.trim()}`)
    lines.push("", message.trim())
    const text = lines.join("\n")

    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer")
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Contacto</h1>
        <p className="mt-2 text-ink-soft">
          ¿Tenés dudas o sugerencias? Escribinos y te respondemos por WhatsApp a la brevedad.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Nombre"
            aria-label="Nombre"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Asunto (opcional)"
            aria-label="Asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          />
          <textarea
            placeholder="Tu mensaje"
            aria-label="Mensaje"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-7 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark disabled:cursor-not-allowed disabled:bg-ink/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z" />
            </svg>
            Enviar por WhatsApp
          </button>
          <p className="text-xs text-ink-soft">Se abre WhatsApp con tu mensaje listo para enviar.</p>
        </form>

        <div className="space-y-6">
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Dirección</h3>
            <p className="mt-2 text-sm text-ink-soft">Av. Siempre Viva 1234, Buenos Aires, Argentina</p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Contacto</h3>
            <p className="mt-2 text-sm text-ink-soft">hola@dpbelleza.com</p>
            <p className="text-sm text-ink-soft">+54 11 1234-5678</p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">Horario de atención</h3>
            <p className="mt-2 text-sm text-ink-soft">Lunes a viernes de 9 a 18hs</p>
          </div>
          <div className="overflow-hidden rounded-lg">
            <img src="https://picsum.photos/seed/contact-map/700/350" alt="Mapa" className="w-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  )
}
