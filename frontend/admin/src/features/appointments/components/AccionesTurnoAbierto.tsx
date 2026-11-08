import type { EstadoTurno, Turno } from "../api/turnos.api"

const botonGrande =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed"

/** Botones de un turno reservado o confirmado: ✅ desde la hora de inicio; ❌ es "Cancelar" antes y "No vino" después. */
export default function AccionesTurnoAbierto({
  turno,
  empezo,
  ocupado,
  confirmandoCancelar,
  setConfirmandoCancelar,
  onCambiar,
  onCompletar,
}: {
  turno: Turno
  empezo: boolean
  ocupado: boolean
  confirmandoCancelar: boolean
  setConfirmandoCancelar: (v: boolean) => void
  onCambiar: (estado: EstadoTurno) => void
  onCompletar: () => void
}) {
  if (confirmandoCancelar) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="w-full text-base font-medium text-ink sm:w-auto">¿Seguro que querés cancelar este turno?</p>
        <button type="button" disabled={ocupado} onClick={() => onCambiar("cancelado")} className={`${botonGrande} bg-[#c0392b] text-white hover:bg-[#a12b28]`}>
          Sí, cancelar
        </button>
        <button type="button" disabled={ocupado} onClick={() => setConfirmandoCancelar(false)} className={`${botonGrande} border-2 border-cream-dark text-ink hover:border-ink`}>
          No, volver
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={ocupado || !empezo}
        onClick={onCompletar}
        className={`${botonGrande} bg-[#1f8a4c] text-white hover:bg-[#18703d] disabled:bg-cream-dark disabled:text-ink-soft`}
      >
        ✅ Completado
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => (empezo ? onCambiar("ausente") : setConfirmandoCancelar(true))}
        className={`${botonGrande} border-2 border-[#e9b9b6] bg-surface text-[#a12b28] hover:border-[#c0392b] hover:bg-[#fbe4e2]`}
      >
        ❌ {empezo ? "No vino" : "Cancelar"}
      </button>
      {!empezo && <p className="col-span-2 text-sm text-ink-soft">Se puede marcar como completado desde las {turno.horaInicio}.</p>}
      {turno.estado === "reservado" && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar("confirmado")}
          className="col-span-2 min-h-12 rounded-xl border-2 border-cream-dark text-base font-medium text-ink transition hover:border-ink disabled:opacity-40"
        >
          ✓ Confirmó que viene
        </button>
      )}
    </div>
  )
}
