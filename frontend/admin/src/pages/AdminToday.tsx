import { useEffect } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import TurnoFila from "../components/turnos/TurnoFila"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { fromDateKey, toDateKey } from "../lib/fechas"
import { formatLongDate, formatShortDate } from "../lib/format"
import { useAhora } from "../lib/useAhora"
import { estaAbierto, nombreCliente, useAgenda } from "../data/turnos"
import type { Turno } from "../data/turnos"
import { usePedidosPendientes } from "../data/pedidosPendientes"

/** Cuántos días para atrás se buscan turnos que quedaron sin marcar. */
const DIAS_ATRAS = 14
/** Cuántos días para adelante se muestran en "Próximos días". */
const DIAS_ADELANTE = 7
/** La pantalla queda abierta en el local: se refresca sola por si entran reservas de la web. */
const REFRESCO_MS = 2 * 60_000

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function sumarDias(fecha: string, dias: number) {
  const d = fromDateKey(fecha)
  d.setDate(d.getDate() + dias)
  return toDateKey(d)
}

/**
 * Pantalla de inicio del panel: lo que la dueña tiene que atender HOY.
 *
 * Los turnos del día con los botones para marcar qué pasó, los pedidos de la
 * tienda que hay que preparar y lo que viene. Las estadísticas de plata están
 * en Finanzas: esto es para operar, no para analizar.
 *
 * Marcar los turnos importa: Finanzas solo cuenta los "completado". Por eso
 * arriba de todo aparecen los turnos de días anteriores que quedaron abiertos.
 */
export default function AdminToday() {
  const ahora = useAhora()
  const desde = sumarDias(ahora.fecha, -DIAS_ATRAS)
  const hasta = sumarDias(ahora.fecha, DIAS_ADELANTE)

  // Un solo pedido para los tres bloques de turnos (22 días): una recarga, un estado.
  const agenda = useAgenda(desde, hasta)
  const pedidos = usePedidosPendientes()

  const { recargar: recargarTurnos } = agenda
  const { recargar: recargarPedidos } = pedidos
  useEffect(() => {
    const id = setInterval(() => {
      recargarTurnos()
      recargarPedidos()
    }, REFRESCO_MS)
    return () => clearInterval(id)
  }, [recargarTurnos, recargarPedidos])

  const header = (
    <PageHeader title="Hoy" description={capitalizar(formatLongDate(ahora.fecha))} withPeriod={false} />
  )

  if (agenda.cargando && !agenda.turnos) {
    return (
      <div>
        {header}
        <Panel>
          <Cargando alto="h-64" />
        </Panel>
      </div>
    )
  }
  if (!agenda.turnos) {
    return (
      <div>
        {header}
        <Panel>
          <ErrorCarga mensaje={agenda.error ?? "No se pudieron cargar los turnos."} onReintentar={agenda.recargar} alto="h-64" />
        </Panel>
      </div>
    )
  }

  const turnos = agenda.turnos
  const sinMarcar = turnos.filter((t) => t.fecha < ahora.fecha && estaAbierto(t))
  const deHoy = turnos.filter((t) => t.fecha === ahora.fecha)
  const proximos = turnos.filter((t) => t.fecha > ahora.fecha && t.estado !== "cancelado")

  const activosHoy = deHoy.filter((t) => t.estado !== "cancelado")
  const siguiente = deHoy.find((t) => estaAbierto(t) && t.horaInicio > ahora.hora)
  const paraMarcarHoy = deHoy.filter((t) => estaAbierto(t) && t.horaInicio <= ahora.hora)
  const paraMarcar = sinMarcar.length + paraMarcarHoy.length
  const previstoHoy = activosHoy.filter((t) => t.estado !== "ausente").reduce((s, t) => s + t.precio, 0)

  const fila = (t: Turno, mostrarFecha = false) => (
    <TurnoFila
      key={t.id}
      turno={t}
      ahora={ahora}
      mostrarFecha={mostrarFecha}
      onCambiarEstado={(estado) => agenda.cambiarEstado(t.id, estado)}
    />
  )

  return (
    <div>
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Turnos de hoy"
          value={String(activosHoy.length)}
          nota={activosHoy.length ? `${formatPrice(previstoHoy)} si se hacen todos` : "No hay turnos para hoy"}
        />
        <StatTile
          label="Próximo turno"
          value={siguiente ? siguiente.horaInicio : "—"}
          nota={siguiente ? `${nombreCliente(siguiente)} · ${siguiente.servicio.nombre}` : "No quedan turnos por hoy"}
        />
        <StatTile
          label="Para marcar"
          value={String(paraMarcar)}
          nota={paraMarcar ? "Ya pasaron y falta decir si se hicieron" : "Todo al día"}
        />
      </div>

      {agenda.error && (
        <p className="mt-4 text-sm text-[#a12b28]" role="alert">
          No se pudo actualizar la agenda: {agenda.error}
        </p>
      )}

      {sinMarcar.length > 0 && (
        <Panel
          title="Quedaron sin marcar"
          description="Turnos de días anteriores que siguen abiertos. Hasta que no se marquen como completados, no suman en Finanzas."
          className="mt-6 border-[#e9b9b6]"
        >
          <ul className="space-y-3">{sinMarcar.map((t) => fila(t, true))}</ul>
        </Panel>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Turnos de hoy">
          {deHoy.length ? (
            <ul className="space-y-3">{deHoy.map((t) => fila(t))}</ul>
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">No hay turnos para hoy.</p>
          )}
        </Panel>

        <div className="space-y-6">
          <PanelPedidos pedidos={pedidos} />

          <Panel title="Próximos días" description={`Los turnos de los próximos ${DIAS_ADELANTE} días.`}>
            {proximos.length ? (
              <ul className="divide-y divide-cream-dark">
                {proximos.map((t) => (
                  <li key={t.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                    <span className="w-20 shrink-0 text-ink-soft">{formatShortDate(t.fecha)}</span>
                    <span className="w-11 shrink-0 font-medium tabular-nums text-ink">{t.horaInicio}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{nombreCliente(t)}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {t.servicio.nombre}
                        {t.estado === "confirmado" && " · confirmado"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-ink-soft">No hay turnos en los próximos días.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function PanelPedidos({ pedidos }: { pedidos: ReturnType<typeof usePedidosPendientes> }) {
  return (
    <Panel title="Pedidos para preparar" description="De la tienda online, sin entregar todavía.">
      {pedidos.cargando && !pedidos.datos ? (
        <Cargando alto="h-24" />
      ) : !pedidos.datos ? (
        <ErrorCarga mensaje={pedidos.error ?? "No se pudieron cargar los pedidos."} onReintentar={pedidos.recargar} alto="h-24" />
      ) : pedidos.datos.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">No hay pedidos esperando.</p>
      ) : (
        <ul className="divide-y divide-cream-dark">
          {pedidos.datos.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">
                  #{p.id} · {[p.cliente.nombre, p.cliente.apellido].filter(Boolean).join(" ")}
                </span>
                <span className="block text-xs text-ink-soft">
                  {p.unidades} {p.unidades === 1 ? "producto" : "productos"} · {formatShortDate(p.creadoEn.slice(0, 10))}
                  {p.estado === "confirmado" && " · confirmado"}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-ink">{formatPrice(p.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
