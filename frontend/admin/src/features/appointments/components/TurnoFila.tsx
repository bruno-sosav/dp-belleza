import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import EstadoBadge from "./EstadoBadge"
import FormCobro from "../../payments/components/FormCobro"
import type { MedioPago } from "../../payments/lib/medios"
import BotonWhatsApp from "./BotonWhatsApp"
import { ApiError } from "../../../shared/lib/api"
import { formatLongDate, formatShortDate } from "../../../shared/lib/format"
import type { Ahora } from "../../../shared/lib/useAhora"
import { estaAbierto, faltaCobrar, nombreCliente } from "../api/turnos.api"
import type { EstadoTurno, Turno } from "../api/turnos.api"

const botonGrande =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed"

/**
 * Un turno con DOS botones: ✅ y ❌. Pensado para que la dueña lo use sin pensar.
 *
 *   ✅ Completado  -> "completado". Se habilita cuando el turno ya empezó
 *                    (el backend no deja marcar como hecho algo que no pasó).
 *   ❌ Cancelar    -> antes de la hora del turno: "cancelado" (libera el horario).
 *   ❌ No vino     -> después de la hora: "ausente". Es el mismo botón, pero así
 *                    queda registrado quién falta sin avisar, que no es lo mismo
 *                    que cancelar.
 *
 * Una vez marcado, la fila muestra el resultado grande y un "Deshacer" chico
 * por si tocó el botón equivocado (cancelado no se deshace: libera el horario).
 */
export default function TurnoFila({
  turno,
  ahora,
  onCambiarEstado,
  onCompletar,
  onCobrar,
  onEditar,
  mostrarFecha = false,
}: {
  turno: Turno
  ahora: Ahora
  onCambiarEstado: (estado: EstadoTurno) => Promise<void>
  /** ✅ Completado: marca el turno y anota lo cobrado (null = "todavía no cobré"). */
  onCompletar: (cobro: { monto: number; medio: MedioPago } | null) => Promise<void>
  /** Cobrar lo que falta de un turno ya completado. */
  onCobrar: (cobro: { monto: number; medio: MedioPago }) => Promise<void>
  /** Abre el formulario para cambiar día, hora, servicio o nota. */
  onEditar?: () => void
  /** Para listas de varios días: muestra "lun 13/10" arriba de la hora. */
  mostrarFecha?: boolean
}) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  /** "completar": ✅ Completado pidiendo el cobro. "cobrar": cobrar lo que falta de uno ya completado. */
  const [cobrando, setCobrando] = useState<"completar" | "cobrar" | null>(null)
  const falta = faltaCobrar(turno)
  const detalleCobro = `Precio ${formatPrice(turno.precio)}${turno.cobrado ? ` · ya pagó ${formatPrice(turno.cobrado)}` : ""}`

  const esHoy = turno.fecha === ahora.fecha
  const empezo = turno.fecha < ahora.fecha || (esHoy && turno.horaInicio <= ahora.hora)
  const abierto = estaAbierto(turno)
  const enCurso = esHoy && abierto && empezo && ahora.hora < turno.horaFin
  const nombre = nombreCliente(turno)

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
      className={`rounded-2xl border-2 p-4 sm:p-5 ${enCurso ? "border-rose-dark bg-rose/10" : "border-cream-dark bg-surface"} ${
        turno.estado === "cancelado" ? "opacity-60" : ""
      }`}
    >
      <div className="flex gap-4">
        <div className="w-20 shrink-0">
          {mostrarFecha && <p className="text-sm font-medium text-ink-soft">{formatShortDate(turno.fecha)}</p>}
          <p className="text-2xl font-bold tabular-nums text-ink">{turno.horaInicio}</p>
          <p className="text-sm tabular-nums text-ink-soft">a {turno.horaFin}</p>
        </div>

        <div className="min-w-0 flex-1">
          {enCurso && <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-rose-dark">Ahora</p>}
          <p className="text-xl font-semibold text-ink">{nombre}</p>
          <p className="mt-0.5 text-base text-ink">{turno.servicio.nombre}</p>
          <p className="text-base text-ink-soft">{formatPrice(turno.precio)}</p>
          {turno.sena && (
            <p className="mt-1 text-base text-ink">
              {turno.sena.estado === "pagada"
                ? `💳 Seña pagada: ${formatPrice(turno.sena.monto)} · resta ${formatPrice(turno.precio - turno.sena.monto)}`
                : turno.sena.estado === "pendiente"
                  ? `⏳ Esperando el pago de la seña (${formatPrice(turno.sena.monto)})`
                  : "Seña no pagada"}
            </p>
          )}
          {turno.estado === "cancelado" && turno.sena?.estado === "pagada" && (
            <p className="mt-2 rounded-lg bg-[#fdf3dc] px-3 py-2 text-sm text-ink">⚠️ Pagó la seña y el turno está cancelado: devolvésela o ofrecele otro horario.</p>
          )}
          {turno.notas && <p className="mt-2 rounded-lg bg-cream-dark/60 px-3 py-2 text-sm text-ink">Nota: {turno.notas}</p>}
        </div>

        {turno.estado !== "cancelado" && (
          <BotonWhatsApp telefono={turno.cliente.telefono} nombre={nombre} mensaje={mensaje} />
        )}
      </div>

      <div className="mt-4 border-t border-cream-dark pt-4">
        {cobrando ? (
          <FormCobro
            montoSugerido={falta}
            detalle={detalleCobro}
            textoGuardar={cobrando === "completar" ? "✅ Completado y cobrado" : "Guardar cobro"}
            onGuardar={async (cobro) => {
              await (cobrando === "completar" ? onCompletar(cobro) : onCobrar(cobro))
              setCobrando(null)
            }}
            onSinCobrar={
              cobrando === "completar"
                ? async () => {
                    await onCompletar(null)
                    setCobrando(null)
                  }
                : undefined
            }
            onCancelar={() => setCobrando(null)}
          />
        ) : abierto ? (
          confirmandoCancelar ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="w-full text-base font-medium text-ink sm:w-auto">¿Seguro que querés cancelar este turno?</p>
              <button type="button" disabled={ocupado} onClick={() => cambiar("cancelado")} className={`${botonGrande} bg-[#c0392b] text-white hover:bg-[#a12b28]`}>
                Sí, cancelar
              </button>
              <button type="button" disabled={ocupado} onClick={() => setConfirmandoCancelar(false)} className={`${botonGrande} border-2 border-cream-dark text-ink hover:border-ink`}>
                No, volver
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={ocupado || !empezo}
                onClick={() => setCobrando("completar")}
                className={`${botonGrande} bg-[#1f8a4c] text-white hover:bg-[#18703d] disabled:bg-cream-dark disabled:text-ink-soft`}
              >
                ✅ Completado
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => (empezo ? cambiar("ausente") : setConfirmandoCancelar(true))}
                className={`${botonGrande} border-2 border-[#e9b9b6] bg-surface text-[#a12b28] hover:border-[#c0392b] hover:bg-[#fbe4e2]`}
              >
                ❌ {empezo ? "No vino" : "Cancelar"}
              </button>
              {!empezo && (
                <p className="col-span-2 text-sm text-ink-soft">Se puede marcar como completado desde las {turno.horaInicio}.</p>
              )}
              {turno.estado === "reservado" && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => cambiar("confirmado")}
                  className="col-span-2 min-h-12 rounded-xl border-2 border-cream-dark text-base font-medium text-ink transition hover:border-ink disabled:opacity-40"
                >
                  ✓ Confirmó que viene
                </button>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <EstadoBadge estado={turno.estado} grande />
            {turno.estado === "completado" &&
              (falta > 0 ? (
                <button
                  type="button"
                  onClick={() => setCobrando("cobrar")}
                  className="min-h-12 rounded-xl bg-[#fdf3dc] px-4 text-base font-semibold text-ink ring-1 ring-[#e0b44a] hover:bg-[#fbe9bf]"
                >
                  Falta cobrar {formatPrice(falta)} · Cobrar
                </button>
              ) : (
                <span className="text-base text-ink-soft">Cobrado {formatPrice(turno.cobrado)}</span>
              ))}
            {turno.canceladoPor === "clienta" && <span className="text-base text-ink-soft">Lo canceló la clienta desde la web</span>}
            {turno.canceladoPor === "sistema" && <span className="text-base text-ink-soft">No pagó la seña a tiempo</span>}
            {(turno.estado === "completado" || turno.estado === "ausente") && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => cambiar("confirmado")}
                className="text-base text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-40"
              >
                Deshacer
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
            {error}
          </p>
        )}

        {onEditar && !confirmandoCancelar && (
          <button
            type="button"
            onClick={onEditar}
            className="mt-3 inline-flex min-h-12 items-center gap-2 text-base text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            ✏️ {abierto ? "Cambiar día, hora o servicio" : turno.estado === "cancelado" ? "Editar la nota" : "Corregir o agregar una nota"}
          </button>
        )}
      </div>
    </li>
  )
}
