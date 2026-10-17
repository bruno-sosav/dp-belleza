import BotonWhatsApp from "./BotonWhatsApp"
import { formatLongDate } from "../../lib/format"
import { nombreCliente } from "../../data/turnos"
import type { Turno } from "../../data/turnos"

/**
 * Turnos pedidos que quedaron afuera después de cerrar un día o cambiar el
 * horario. No se cancelan solos: la dueña le escribe a cada clienta (el
 * WhatsApp ya va con el mensaje armado) y decide si lo pasa a otro día.
 */
export default function TurnosParaAvisar({ turnos, motivo }: { turnos: Turno[]; motivo: string }) {
  if (!turnos.length) return null
  return (
    <div className="rounded-xl border border-[#e0b44a] bg-[#fdf3dc] p-4" role="status">
      <p className="text-base font-semibold text-ink">
        ⚠️ {turnos.length === 1 ? "Hay 1 turno pedido" : `Hay ${turnos.length} turnos pedidos`} {motivo}.
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        No se cancelaron. Escribile a cada clienta para pasarlo a otro día; después lo cancelás desde Turnos.
      </p>
      <ul className="mt-3 divide-y divide-[#e0b44a]/40">
        {turnos.map((t) => {
          const nombre = nombreCliente(t)
          const mensaje = `Hola ${t.cliente.nombre}! Te escribo por tu turno de ${t.servicio.nombre} del ${formatLongDate(t.fecha)} a las ${t.horaInicio}: ese día no vamos a poder atenderte. ¿Te parece si lo pasamos a otro día?`
          return (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-ink">{nombre}</p>
                <p className="text-sm text-ink-soft first-letter:uppercase">
                  {formatLongDate(t.fecha)} a las {t.horaInicio} · {t.servicio.nombre}
                </p>
              </div>
              <BotonWhatsApp telefono={t.cliente.telefono} nombre={nombre} mensaje={mensaje} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
