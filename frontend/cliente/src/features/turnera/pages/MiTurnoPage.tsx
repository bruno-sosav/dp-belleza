import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { parseDateKey } from "../api/disponibilidad.api"
import { buscarMiTurno, cancelarMiTurno, textoCancelacion } from "../api/miTurno.api"
import type { DatosMiTurno, MiTurno as Turno } from "../api/miTurno.api"
import Field from "../components/Field"
import { ApiError } from "../lib/api"
import { formatDuration, formatLongDate, formatTime } from "../lib/format"
import { cardClass, containerClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import { whatsappUrl } from "../../home/lib/whatsapp"
import { useNegocio } from "../../../shared/lib/negocio"

/**
 * Buscar el turno con código + teléfono y cancelarlo hasta el límite que puso la dueña.
 * Desde la confirmación llega con los datos cargados por `state`.
 */
export default function MiTurnoPage() {
  const inicial = (useLocation().state as DatosMiTurno | null) ?? { codigo: "", telefono: "" }
  const negocio = useNegocio()
  const [datos, setDatos] = useState<DatosMiTurno>(inicial)
  const [turno, setTurno] = useState<Turno | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [recienCancelado, setRecienCancelado] = useState(false)

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setError(null)
    setTurno(null)
    setRecienCancelado(false)
    try {
      setTurno(await buscarMiTurno(datos))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos buscar tu turno. Probá de nuevo.")
    } finally {
      setBuscando(false)
    }
  }

  async function cancelar() {
    setCancelando(true)
    setError(null)
    try {
      setTurno(await cancelarMiTurno(datos))
      setRecienCancelado(true)
      setConfirmando(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cancelar el turno. Probá de nuevo.")
    } finally {
      setCancelando(false)
    }
  }

  const fecha = turno ? parseDateKey(turno.fecha) : null
  const mensajeWhatsapp = turno
    ? `Hola! Soy ${turno.nombre}, tengo el turno ${turno.codigo} de ${turno.servicio.nombre} el ${formatLongDate(fecha!)} a las ${formatTime(turno.hora)} y necesito cancelarlo o cambiarlo.`
    : ""

  return (
    <div className={`${containerClass} py-12`}>
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-semibold text-ink">Mi turno</h1>
        <p className="mt-2 text-ink-soft">
          Buscá tu turno con el código que te dimos al reservar y tu teléfono.
          {negocio && ` Podés cancelarlo ${textoCancelacion(negocio.cancelacionHoras)}.`}
        </p>

        <form onSubmit={buscar} className={`${cardClass} mt-8 space-y-5 p-6`}>
          <Field label="Código del turno" htmlFor="codigo" required hint="Empieza con DP-, por ejemplo DP-000123.">
            <input
              id="codigo"
              required
              autoComplete="off"
              placeholder="DP-000123"
              value={datos.codigo}
              onChange={(e) => setDatos({ ...datos, codigo: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono" htmlFor="telefono" required hint="El mismo que pusiste al reservar.">
            <input
              id="telefono"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ej: 223 555 1234"
              value={datos.telefono}
              onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={buscando} className={`${primaryButtonClass} w-full`}>
            {buscando ? "Buscando…" : "Buscar mi turno"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose/50 bg-rose/10 px-5 py-4 text-sm text-ink" role="alert">
            {error}
          </div>
        )}

        {turno && fecha && (
          <div className={`${cardClass} mt-8 p-6`}>
            <p className="text-xs uppercase tracking-[0.15em] text-ink-soft/70">Turno {turno.codigo}</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-ink">{turno.servicio.nombre}</h2>
            <p className="mt-1 text-ink">
              {formatLongDate(fecha)} · {formatTime(turno.hora)}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {formatDuration(turno.servicio.duracionMin)} · {formatPrice(turno.precio)}
            </p>

            <div className="mt-6 border-t border-cream-dark pt-5">
              {turno.estado === "cancelado" ? (
                <>
                  <p className="font-medium text-ink">
                    {recienCancelado ? "✓ Listo, tu turno quedó cancelado." : "Este turno está cancelado."}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">Si querés, reservá otro día y horario.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link to={`/reservar/${turno.servicio.id}`} className={primaryButtonClass}>
                      Reservar otro día
                    </Link>
                    <Link to="/" className={secondaryButtonClass}>
                      Volver al inicio
                    </Link>
                  </div>
                </>
              ) : turno.puedeCancelar ? (
                confirmando ? (
                  <>
                    <p className="font-medium text-ink">¿Seguro que querés cancelar este turno?</p>
                    <p className="mt-1 text-sm text-ink-soft">El horario queda libre para otra persona.</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button type="button" disabled={cancelando} onClick={() => void cancelar()} className={primaryButtonClass}>
                        {cancelando ? "Cancelando…" : "Sí, cancelar"}
                      </button>
                      <button type="button" disabled={cancelando} onClick={() => setConfirmando(false)} className={secondaryButtonClass}>
                        No, lo mantengo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">
                      ¿No podés venir? Cancelalo y, si querés, elegí otro día. Para cambiarlo, cancelá este y reservá uno nuevo.
                    </p>
                    <button type="button" onClick={() => setConfirmando(true)} className={`${secondaryButtonClass} mt-4`}>
                      Cancelar mi turno
                    </button>
                  </>
                )
              ) : turno.fueraDeTermino ? (
                <>
                  <p className="font-medium text-ink">Falta poco para tu turno.</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Se puede cancelar desde acá {textoCancelacion(turno.horasMinimas)}. Para cancelarlo o cambiarlo ahora, escribinos.
                  </p>
                  {negocio?.telefono && (
                    <a href={whatsappUrl(negocio.telefono, mensajeWhatsapp)} target="_blank" rel="noopener noreferrer" className={`${primaryButtonClass} mt-4`}>
                      Escribir por WhatsApp
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-soft">Este turno ya pasó.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
