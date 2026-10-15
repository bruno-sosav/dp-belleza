import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import EstadoBadge from "./EstadoBadge"
import { ApiError } from "../../lib/api"
import { formatLongDate, formatShortDate } from "../../lib/format"
import { smallButtonClass, smallPrimaryButtonClass } from "../../lib/styles"
import { whatsappCliente } from "../../lib/whatsapp"
import type { Ahora } from "../../lib/useAhora"
import { estaAbierto, nombreCliente } from "../../data/turnos"
import type { EstadoTurno, Turno } from "../../data/turnos"

/**
 * Un turno con los botones para decir qué pasó.
 *
 * Qué botones aparecen depende del estado y de la hora: "Completado" y "No vino"
 * recién cuando el turno empezó, "Confirmar" solo antes. El backend valida lo
 * mismo; esto es para no ofrecer un botón que va a fallar.
 */
export default function TurnoFila({
  turno,
  ahora,
  onCambiarEstado,
  mostrarFecha = false,
}: {
  turno: Turno
  ahora: Ahora
  onCambiarEstado: (estado: EstadoTurno) => Promise<void>
  /** Para listas de varios días: muestra "lun 13/10" junto a la hora. */
  mostrarFecha?: boolean
}) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  const esHoy = turno.fecha === ahora.fecha
  const empezo = turno.fecha < ahora.fecha || (esHoy && turno.horaInicio <= ahora.hora)
  const enCurso = esHoy && estaAbierto(turno) && turno.horaInicio <= ahora.hora && ahora.hora < turno.horaFin
  const abierto = estaAbierto(turno)

  async function cambiar(estado: EstadoTurno) {
    setOcupado(true)
    setError(null)
    try {
      await onCambiarEstado(estado)
      setConfirmandoCancelar(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio.")
    } finally {
      setOcupado(false)
    }
  }

  const mensaje = `¡Hola ${turno.cliente.nombre}! Te escribimos de Dp.belleza por tu turno de ${turno.servicio.nombre} el ${formatLongDate(turno.fecha)} a las ${turno.horaInicio}.`

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start ${
        enCurso ? "border-rose-dark bg-rose/10" : "border-cream-dark"
      } ${turno.estado === "cancelado" ? "opacity-60" : ""}`}
    >
      <div className="w-24 shrink-0">
        {mostrarFecha && <p className="text-xs text-ink-soft">{formatShortDate(turno.fecha)}</p>}
        <p className="text-lg font-semibold tabular-nums text-ink">{turno.horaInicio}</p>
        <p className="text-xs tabular-nums text-ink-soft">hasta {turno.horaFin}</p>
        {enCurso && <p className="mt-1 text-xs font-medium text-rose-dark">En curso</p>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{nombreCliente(turno)}</p>
          <EstadoBadge estado={turno.estado} />
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">
          {turno.servicio.nombre} · {formatPrice(turno.precio)}
        </p>
        {turno.notas && <p className="mt-1 text-sm italic text-ink-soft">“{turno.notas}”</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {abierto && empezo && (
            <>
              <button type="button" disabled={ocupado} onClick={() => cambiar("completado")} className={smallPrimaryButtonClass}>
                ✓ Completado
              </button>
              <button type="button" disabled={ocupado} onClick={() => cambiar("ausente")} className={smallButtonClass}>
                No vino
              </button>
            </>
          )}
          {turno.estado === "reservado" && !empezo && (
            <button type="button" disabled={ocupado} onClick={() => cambiar("confirmado")} className={smallPrimaryButtonClass}>
              Confirmar
            </button>
          )}
          {(turno.estado === "completado" || turno.estado === "ausente") && (
            <button type="button" disabled={ocupado} onClick={() => cambiar("confirmado")} className={smallButtonClass}>
              ↺ Deshacer
            </button>
          )}

          {turno.estado !== "cancelado" && (
            <a
              href={whatsappCliente(turno.cliente.telefono, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className={smallButtonClass}
            >
              WhatsApp
            </a>
          )}

          {abierto &&
            (confirmandoCancelar ? (
              <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
                ¿Cancelar el turno? Libera el horario.
                <button type="button" disabled={ocupado} onClick={() => cambiar("cancelado")} className={smallPrimaryButtonClass}>
                  Sí, cancelar
                </button>
                <button type="button" disabled={ocupado} onClick={() => setConfirmandoCancelar(false)} className={smallButtonClass}>
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setConfirmandoCancelar(true)}
                className="px-1 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline disabled:opacity-40"
              >
                Cancelar turno
              </button>
            ))}
        </div>

        {error && (
          <p className="mt-2 text-xs text-[#a12b28]" role="alert">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}
