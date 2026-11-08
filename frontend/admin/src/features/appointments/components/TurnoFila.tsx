import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import FormCobro from "../../payments/components/FormCobro"
import type { MedioPago } from "../../payments/lib/medios"
import TurnoDatos from "./TurnoDatos"
import AccionesTurnoAbierto from "./AccionesTurnoAbierto"
import EstadoTurnoCerrado from "./EstadoTurnoCerrado"
import { ApiError } from "../../../shared/lib/api"
import type { Ahora } from "../../../shared/lib/useAhora"
import { estaAbierto, faltaCobrar } from "../api/turnos.api"
import type { EstadoTurno, Turno } from "../api/turnos.api"
import Icono from "../../../shared/components/Icono"

function textoEditar(turno: Turno) {
  if (estaAbierto(turno)) return "Cambiar día, hora o servicio"
  return turno.estado === "cancelado" ? "Editar la nota" : "Corregir o agregar una nota"
}

/** Si el turno ya empezó (habilita Completado) y si está en curso ahora mismo (se resalta). */
function momento(turno: Turno, ahora: Ahora) {
  const esHoy = turno.fecha === ahora.fecha
  const empezo = turno.fecha < ahora.fecha || (esHoy && turno.horaInicio <= ahora.hora)
  const enCurso = esHoy && estaAbierto(turno) && empezo && ahora.hora < turno.horaFin
  return { empezo, enCurso }
}

function detalleCobro(turno: Turno) {
  const yaPago = turno.cobrado ? ` · ya pagó ${formatPrice(turno.cobrado)}` : ""
  return `Precio ${formatPrice(turno.precio)}${yaPago}`
}

/**
 * Un turno de la agenda: arriba sus datos; abajo los botones (si está abierto),
 * su estado final (si no) o el formulario de cobro.
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
  /** Completado: marca el turno y anota lo cobrado (null = "todavía no cobré"). */
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
  /** "completar": Completado pidiendo el cobro. "cobrar": cobrar lo que falta de uno ya completado. */
  const [cobrando, setCobrando] = useState<"completar" | "cobrar" | null>(null)
  const falta = faltaCobrar(turno)

  const { empezo, enCurso } = momento(turno, ahora)
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

  async function guardarCobro(cobro: { monto: number; medio: MedioPago } | null) {
    await (cobrando === "completar" ? onCompletar(cobro) : onCobrar(cobro!))
    setCobrando(null)
  }

  const borde = enCurso ? "border-rose-dark bg-rose/10" : "border-cream-dark bg-surface"
  return (
    <li className={`rounded-2xl border-2 p-4 sm:p-5 ${borde} ${turno.estado === "cancelado" ? "opacity-60" : ""}`}>
      <TurnoDatos turno={turno} enCurso={enCurso} mostrarFecha={mostrarFecha} />

      <div className="mt-4 border-t border-cream-dark pt-4">
        {cobrando ? (
          <FormCobro
            montoSugerido={falta}
            detalle={detalleCobro(turno)}
            textoGuardar={cobrando === "completar" ? "Completado y cobrado" : "Guardar cobro"}
            onGuardar={guardarCobro}
            onSinCobrar={cobrando === "completar" ? () => guardarCobro(null) : undefined}
            onCancelar={() => setCobrando(null)}
          />
        ) : abierto ? (
          <AccionesTurnoAbierto
            turno={turno}
            empezo={empezo}
            ocupado={ocupado}
            confirmandoCancelar={confirmandoCancelar}
            setConfirmandoCancelar={setConfirmandoCancelar}
            onCambiar={cambiar}
            onCompletar={() => setCobrando("completar")}
          />
        ) : (
          <EstadoTurnoCerrado turno={turno} falta={falta} ocupado={ocupado} onCobrar={() => setCobrando("cobrar")} onDeshacer={() => cambiar("confirmado")} />
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
            <Icono nombre="lapiz" />
            {textoEditar(turno)}
          </button>
        )}
      </div>
    </li>
  )
}
