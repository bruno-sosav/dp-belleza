import { useState } from "react"
import { ApiError } from "../../shared/lib/api"
import { inputClass, primaryButtonClass } from "../../shared/lib/styles"
import { actualizarCliente } from "../../data/clientes"

/**
 * Notas internas sobre la clienta ("piel sensible", "prefiere la mañana"…).
 * Solo las ve la dueña. El botón de guardar aparece recién cuando hay cambios.
 */
export default function NotasCliente({ id, notas, onGuardado }: { id: number; notas: string | null; onGuardado: () => void }) {
  const [texto, setTexto] = useState(notas ?? "")
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  const hayCambios = texto.trim() !== (notas ?? "")

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    try {
      await actualizarCliente(id, { notas: texto.trim() || null })
      setMensaje({ ok: true, texto: "✅ Notas guardadas" })
      onGuardado()
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof ApiError ? err.message : "No se pudieron guardar las notas." })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <label htmlFor="notas-clienta" className="sr-only">
        Notas sobre la clienta
      </label>
      <textarea
        id="notas-clienta"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setMensaje(null)
        }}
        rows={4}
        maxLength={2000}
        placeholder="Por ejemplo: piel sensible, prefiere turnos a la mañana…"
        className={`${inputClass} text-base`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {hayCambios && (
          <button type="button" onClick={guardar} disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
            {guardando ? "Guardando…" : "Guardar notas"}
          </button>
        )}
        {mensaje && <p className={`text-base ${mensaje.ok ? "text-[#18703d]" : "text-[#a12b28]"}`}>{mensaje.texto}</p>}
      </div>
    </div>
  )
}
