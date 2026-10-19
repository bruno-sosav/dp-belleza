import { useCallback, useEffect, useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import StatTile from "../components/StatTile"
import TurnoFila from "../components/turnos/TurnoFila"
import FormularioTurno from "../components/agenda/FormularioTurno"
import { Link } from "react-router-dom"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { sumarDias } from "../lib/fechas"
import { formatLongDate, formatShortDate } from "../lib/format"
import { useAhora } from "../lib/useAhora"
import { primaryButtonClass } from "../lib/styles"
import { estaAbierto, nombreCliente, useAgenda } from "../data/turnos"
import type { Turno } from "../data/turnos"
import { usePedidosPendientes } from "../data/pedidosPendientes"
import { useRecordatorios } from "../data/recordatorios"

/** Cuántos días para atrás se buscan turnos que quedaron sin marcar. */
const DIAS_ATRAS = 14
/** Cuántos días para adelante se muestran en "Próximos días". */
const DIAS_ADELANTE = 7
/** La pantalla queda abierta en el local: se refresca sola por si entran reservas de la web. */
const REFRESCO_MS = 2 * 60_000

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)


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
  const recordatorios = useRecordatorios()
  /** Formulario de turno abierto: uno nuevo (sin turno) o cambiar uno. */
  const [formulario, setFormulario] = useState<{ turno?: Turno } | null>(null)
  const cerrarFormulario = useCallback(() => setFormulario(null), [])

  const { recargar: recargarTurnos } = agenda
  const { recargar: recargarPedidos } = pedidos
  const { recargar: recargarRecordatorios } = recordatorios
  useEffect(() => {
    const id = setInterval(() => {
      recargarTurnos()
      recargarPedidos()
      recargarRecordatorios()
    }, REFRESCO_MS)
    return () => clearInterval(id)
  }, [recargarTurnos, recargarPedidos, recargarRecordatorios])

  const header = (
    <PageHeader
      title="Hoy"
      description={capitalizar(formatLongDate(ahora.fecha))}
      withPeriod={false}
      action={
        <button type="button" onClick={() => setFormulario({})} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          + Nuevo turno
        </button>
      }
    />
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
  // Las que cancelaron desde la web turnos que todavía no llegaron: la dueña
  // tiene que enterarse (queda un hueco libre que puede ofrecer).
  const canceladosWeb = turnos.filter(
    (t) => t.canceladoPor === "clienta" && (t.fecha > ahora.fecha || (t.fecha === ahora.fecha && t.horaInicio > ahora.hora)),
  )

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
      onCompletar={(cobro) => agenda.completar(t.id, cobro)}
      onCobrar={(cobro) => agenda.cobrar(t.id, cobro)}
      onEditar={() => setFormulario({ turno: t })}
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
          label="Falta marcar"
          value={String(paraMarcar)}
          nota={paraMarcar ? "Turnos que ya pasaron: marcá si se hicieron" : "Todo al día ✅"}
        />
      </div>

      {agenda.error && (
        <p className="mt-4 text-base text-[#a12b28]" role="alert">
          No se pudo actualizar la agenda: {agenda.error}
        </p>
      )}

      {sinMarcar.length > 0 && (
        <Panel
          title="Quedaron sin marcar"
          description="Son de días anteriores y nadie los marcó. Si no se marcan, esa plata no aparece en Finanzas."
          className="mt-6 border-[#e9b9b6]"
        >
          <ul className="space-y-4">{sinMarcar.map((t) => fila(t, true))}</ul>
        </Panel>
      )}

      {(recordatorios.datos?.paraMandar.length ?? 0) > 0 && (
        <Link
          to="/recordatorios"
          className="mt-6 flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-[#25d366]/50 bg-[#e8f8ee] px-5 py-3 text-lg text-ink transition hover:border-[#25d366]"
        >
          <span>
            📨 Tenés <strong>{recordatorios.datos!.paraMandar.length}</strong>{" "}
            {recordatorios.datos!.paraMandar.length === 1 ? "recordatorio para mandar" : "recordatorios para mandar"}
          </span>
          <span className="shrink-0 font-semibold text-[#14532d]">Ir →</span>
        </Link>
      )}

      {canceladosWeb.length > 0 && (
        <Panel
          title="Cancelaron desde la web"
          description="Esos horarios ya quedaron libres para otras clientas."
          className="mt-6 border-[#e9b9b6]"
        >
          <ul className="divide-y divide-cream-dark">
            {canceladosWeb.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 py-3 text-base">
                <span className="w-24 shrink-0 text-ink-soft">{t.fecha === ahora.fecha ? "Hoy" : formatShortDate(t.fecha)}</span>
                <span className="font-semibold tabular-nums text-ink">{t.horaInicio}</span>
                <span className="text-ink">{nombreCliente(t)}</span>
                <span className="text-ink-soft">· {t.servicio.nombre}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Turnos de hoy" description="Cuando termina cada turno, tocá ✅ si se hizo o ❌ si no vino.">
          {deHoy.length ? (
            <ul className="space-y-4">{deHoy.map((t) => fila(t))}</ul>
          ) : (
            <p className="py-10 text-center text-base text-ink-soft">No hay turnos para hoy.</p>
          )}
        </Panel>

        <div className="space-y-6">
          <PanelPedidos pedidos={pedidos} />

          <Panel title="Próximos días" description={`Los turnos de los próximos ${DIAS_ADELANTE} días.`}>
            {proximos.length ? (
              <ul className="divide-y divide-cream-dark">
                {proximos.map((t) => (
                  <li key={t.id} className="flex items-baseline gap-3 py-3 text-base">
                    <span className="w-20 shrink-0 text-ink-soft">{formatShortDate(t.fecha)}</span>
                    <span className="w-12 shrink-0 font-semibold tabular-nums text-ink">{t.horaInicio}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{nombreCliente(t)}</span>
                      <span className="block truncate text-sm text-ink-soft">
                        {t.servicio.nombre}
                        {t.estado === "confirmado" && " · confirmado"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-base text-ink-soft">No hay turnos en los próximos días.</p>
            )}
          </Panel>
        </div>
      </div>

      {formulario && (
        <FormularioTurno
          turno={formulario.turno}
          fechaInicial={formulario.turno?.fecha ?? ahora.fecha}
          ahora={ahora}
          onGuardado={() => {
            setFormulario(null)
            agenda.recargar()
          }}
          onCerrar={cerrarFormulario}
        />
      )}
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
        <p className="py-6 text-center text-base text-ink-soft">No hay pedidos esperando.</p>
      ) : (
        <ul className="divide-y divide-cream-dark">
          {pedidos.datos.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3 py-3 text-base">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  #{p.id} · {[p.cliente.nombre, p.cliente.apellido].filter(Boolean).join(" ")}
                </span>
                <span className="block text-sm text-ink-soft">
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
