import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ApiError } from "../../../shared/lib/api"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { eliminarCliente } from "../api/clientes.api"

/**
 * Eliminar una clienta. Solo se permite si no tiene turnos ni compras: con
 * historial, borrarla haría desaparecer esa plata de Finanzas (el backend
 * también lo impide). En ese caso no se ofrece el botón y se explica por qué,
 * en vez de dejarla tocar algo que va a fallar.
 */
export default function EliminarCliente({ id, nombre, tieneHistorial }: { id: number; nombre: string; tieneHistorial: boolean }) {
  const navigate = useNavigate()
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (tieneHistorial) {
    return (
      <p className="text-base text-ink-soft">
        {nombre} tiene turnos o compras registrados, así que no se puede eliminar: se perdería esa plata en Finanzas.
      </p>
    )
  }

  async function eliminar() {
    setEliminando(true)
    setError(null)
    try {
      await eliminarCliente(id)
      navigate("/clientes", { replace: true, state: { eliminada: nombre } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.")
      setEliminando(false)
    }
  }

  return (
    <div>
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-full text-base font-medium text-ink">¿Seguro que querés eliminar a {nombre}? No se puede deshacer.</p>
          <button
            type="button"
            onClick={eliminar}
            disabled={eliminando}
            className="inline-flex min-h-12 items-center rounded-xl bg-[#c0392b] px-6 text-base font-semibold text-white transition hover:bg-[#a12b28] disabled:opacity-50"
          >
            {eliminando ? "Eliminando…" : "Sí, eliminar"}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
            No, volver
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-[#e9b9b6] px-6 text-base font-semibold text-[#a12b28] transition hover:border-[#c0392b] hover:bg-[#fbe4e2]"
        >
          🗑️ Eliminar clienta
        </button>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
