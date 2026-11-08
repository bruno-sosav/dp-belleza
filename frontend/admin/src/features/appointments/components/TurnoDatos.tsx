import { formatPrice } from "@dp/shared/lib/format"
import BotonWhatsApp from "./BotonWhatsApp"
import { formatLongDate, formatShortDate } from "../../../shared/lib/format"
import { nombreCliente } from "../api/turnos.api"
import type { Turno } from "../api/turnos.api"

function textoSena(sena: NonNullable<Turno["sena"]>, precio: number) {
  if (sena.estado === "pagada") return `💳 Seña pagada: ${formatPrice(sena.monto)} · resta ${formatPrice(precio - sena.monto)}`
  if (sena.estado === "pendiente") return `⏳ Esperando el pago de la seña (${formatPrice(sena.monto)})`
  return "Seña no pagada"
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
        {turno.sena && <p className="mt-1 text-base text-ink">{textoSena(turno.sena, turno.precio)}</p>}
        {cancelado && turno.sena?.estado === "pagada" && (
          <p className="mt-2 rounded-lg bg-[#fdf3dc] px-3 py-2 text-sm text-ink">⚠️ Pagó la seña y el turno está cancelado: devolvésela o ofrecele otro horario.</p>
        )}
        {turno.notas && <p className="mt-2 rounded-lg bg-cream-dark/60 px-3 py-2 text-sm text-ink">Nota: {turno.notas}</p>}
      </div>

      {!cancelado && <BotonWhatsApp telefono={turno.cliente.telefono} nombre={nombre} mensaje={mensaje} />}
    </div>
  )
}
