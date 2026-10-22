import { useEffect } from "react"
import { Link } from "react-router-dom"
import TurnoFila from "../turnos/TurnoFila"
import { formatLongDate } from "../../shared/lib/format"
import type { Ahora } from "../../shared/lib/useAhora"
import type { EstadoTurno, Turno } from "../../data/turnos"
import type { MedioPago } from "../../lib/medios"

/**
 * El detalle de un turno al tocarlo en el calendario. Usa la misma fila que la
 * pantalla de Hoy, así los botones (✅ / ❌ / WhatsApp) son los mismos en todos
 * lados y la dueña aprende una sola forma de hacer las cosas.
 *
 * Se cierra con la X, tocando afuera o con Escape.
 */
export default function ModalTurno({
  turno,
  ahora,
  onCambiarEstado,
  onCompletar,
  onCobrar,
  onEditar,
  onCerrar,
}: {
  turno: Turno
  ahora: Ahora
  onCambiarEstado: (estado: EstadoTurno) => Promise<void>
  onCompletar: (cobro: { monto: number; medio: MedioPago } | null) => Promise<void>
  onCobrar: (cobro: { monto: number; medio: MedioPago }) => Promise<void>
  onEditar: () => void
  onCerrar: () => void
}) {
  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    document.addEventListener("keydown", alApretar)
    return () => document.removeEventListener("keydown", alApretar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-turno-titulo"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-turno-titulo" className="font-display text-2xl font-semibold text-ink first-letter:uppercase">
            {formatLongDate(turno.fecha)}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl text-ink-soft hover:bg-cream-dark hover:text-ink"
          >
            ✕
          </button>
        </div>

        <ul>
          <TurnoFila turno={turno} ahora={ahora} onCambiarEstado={onCambiarEstado} onCompletar={onCompletar} onCobrar={onCobrar} onEditar={onEditar} />
        </ul>

        <Link to={`/clientes/${turno.cliente.id}`} className="mt-4 inline-block text-base text-rose-dark underline underline-offset-4 hover:text-ink">
          Ver la ficha de {turno.cliente.nombre} →
        </Link>
      </div>
    </div>
  )
}
