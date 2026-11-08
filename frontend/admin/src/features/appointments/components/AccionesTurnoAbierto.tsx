import type { EstadoTurno, Turno } from "../api/turnos.api"
import Icono from "../../../shared/components/Icono"

const botonGrande =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed"

/** Botones de un turno reservado o confirmado: Completado desde la hora de inicio; "Cancelar" antes y "No vino" después. */
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
        className={`${botonGrande} bg-exito text-white hover:bg-[#165532] disabled:bg-cream-dark disabled:text-ink-soft`}
      >
        <Icono nombre="check" className="h-6 w-6" />
        Completado
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => (empezo ? onCambiar("ausente") : setConfirmandoCancelar(true))}
        className={`${botonGrande} border-2 border-[#e9b9b6] bg-surface text-peligro hover:border-peligro hover:bg-peligro-claro`}
      >
        <Icono nombre="cruz" className="h-6 w-6" />
        {empezo ? "No vino" : "Cancelar"}
      </button>
      {!empezo && <p className="col-span-2 text-sm text-ink-soft">Se puede marcar como completado desde las {turno.horaInicio}.</p>}
      {turno.estado === "reservado" && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar("confirmado")}
          className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-cream-dark text-base font-medium text-ink transition hover:border-info hover:text-info disabled:opacity-40"
        >
          <Icono nombre="mensaje" />
          Confirmó que viene
        </button>
      )}
    </div>
  )
}
