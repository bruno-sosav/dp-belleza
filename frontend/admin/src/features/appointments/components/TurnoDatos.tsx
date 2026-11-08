import { formatPrice } from "@dp/shared/lib/format"
import BotonWhatsApp from "./BotonWhatsApp"
import { formatLongDate, formatShortDate } from "../../../shared/lib/format"
import { nombreCliente } from "../api/turnos.api"
import type { Turno } from "../api/turnos.api"
import Icono from "../../../shared/components/Icono"

/** La seña del turno: pagada (verde), esperando el pago (ámbar) o vencida. */
function Sena({ sena, precio }: { sena: NonNullable<Turno["sena"]>; precio: number }) {
  if (sena.estado === "pagada") {
    return (
      <p className="mt-1 flex items-center gap-2 text-base font-medium text-exito">
        <Icono nombre="tarjeta" />
        Seña pagada: {formatPrice(sena.monto)} · resta {formatPrice(precio - sena.monto)}
      </p>
    )
  }
  if (sena.estado === "pendiente") {
    return (
      <p className="mt-1 flex items-center gap-2 text-base font-medium text-alerta">
        <Icono nombre="reloj" />
        Esperando el pago de la seña ({formatPrice(sena.monto)})
      </p>
    )
  }
  return <p className="mt-1 text-base text-ink-soft">Seña no pagada</p>
}

/** Parte de arriba de la fila: hora, clienta, servicio, seña, nota y WhatsApp. */
export default function TurnoDatos({ turno, enCurso, mostrarFecha }: { turno: Turno; enCurso: boolean; mostrarFecha: boolean }) {
  const nombre = nombreCliente(turno)
  const cancelado = turno.estado === "cancelado"
  const mensaje = `¡Hola ${turno.cliente.nombre}! Te escribimos de Dp.belleza por tu turno de ${turno.servicio.nombre} el ${formatLongDate(turno.fecha)} a las ${turno.horaInicio}.`

  return (
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
        {turno.sena && <Sena sena={turno.sena} precio={turno.precio} />}
        {cancelado && turno.sena?.estado === "pagada" && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-alerta-claro px-3 py-2 text-sm text-ink">
            <Icono nombre="alerta" className="mt-0.5 h-4 w-4 text-alerta" />
            Pagó la seña y el turno está cancelado: devolvésela o ofrecele otro horario.
          </p>
        )}
        {turno.notas && <p className="mt-2 rounded-lg bg-cream-dark/60 px-3 py-2 text-sm text-ink">Nota: {turno.notas}</p>}
      </div>

      {!cancelado && <BotonWhatsApp telefono={turno.cliente.telefono} nombre={nombre} mensaje={mensaje} />}
    </div>
  )
}
