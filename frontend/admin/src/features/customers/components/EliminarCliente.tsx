import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ApiError } from "../../../shared/lib/api"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { eliminarCliente } from "../api/clientes.api"
import Icono from "../../../shared/components/Icono"

/** Solo sin turnos ni compras (el backend también lo impide): con historial, borraría plata de Finanzas. */
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
            className="inline-flex min-h-12 items-center rounded-xl bg-peligro px-6 text-base font-semibold text-white transition hover:bg-peligro/90 disabled:opacity-50"
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
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-peligro/30 px-6 text-base font-semibold text-peligro transition hover:border-peligro hover:bg-peligro-claro"
        >
          <Icono nombre="tacho" />
          Eliminar clienta
        </button>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-peligro-claro px-3 py-2 text-base text-peligro" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
